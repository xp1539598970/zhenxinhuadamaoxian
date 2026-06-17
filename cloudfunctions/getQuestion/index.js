const cloud = require("wx-server-sdk");
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();

exports.main = async (event, context) => {
  const { type = "random", roomId } = event;

  try {
    let query = db.collection("questions").where({ isActive: true });

    if (type === "truth" || type === "dare") {
      query = query.where({ type });
    } else {
      const randomType = Math.random() > 0.5 ? "truth" : "dare";
      query = query.where({ type: randomType });
    }

    const countRes = await query.count();
    if (countRes.total === 0) {
      return {
        success: false,
        errMsg: "暂无题目",
      };
    }

    const randomIndex = Math.floor(Math.random() * countRes.total);
    const questionRes = await query.skip(randomIndex).limit(1).get();
    const question = questionRes.data[0];

    // 将题目存入房间文档
    if (roomId) {
      await db.collection("rooms").doc(roomId).update({
        data: {
          currentQuestion: question,
          updatedAt: db.serverDate(),
        },
      });
    }

    return {
      success: true,
      data: question,
    };
  } catch (e) {
    return {
      success: false,
      errMsg: e.message,
    };
  }
};
