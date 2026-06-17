const cloud = require("wx-server-sdk");
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openId = wxContext.OPENID;
  const { roomId, content, action } = event;

  try {
    if (!roomId || !action) {
      return { success: false, errMsg: "缺少必要参数" };
    }

    // 查找当前玩家
    const playerRes = await db.collection("players").where({
      roomId: roomId,
      openId: openId,
    }).get();

    if (playerRes.data.length === 0) {
      return { success: false, errMsg: "您不在该房间内" };
    }
    const player = playerRes.data[0];

    // 读取房间数据
    const roomRes = await db.collection("rooms").doc(roomId).get();
    const roomData = roomRes.data;

    if (action === "typing") {
      // 更新"正在输入"状态
      roomData.answerStatus = "typing";
      roomData.typingPlayer = player.nickName || "玩家";
      roomData.typingAt = Date.now();
    } else if (action === "submit") {
      if (!content || !content.trim()) {
        return { success: false, errMsg: "回答内容不能为空" };
      }
      roomData.currentAnswer = {
        content: content.trim(),
        fromPlayer: player.nickName || "玩家",
        fromOpenId: openId,
        submittedAt: Date.now(),
      };
      roomData.answerStatus = "submitted";
      roomData.typingPlayer = null;
    } else if (action === "setQuestion") {
      // 写入新题目（确保所有设备看到同一道题）
      roomData.currentQuestion = event.question || null;
      roomData.answerStatus = "waiting";
      roomData.currentAnswer = null;
      roomData.typingPlayer = null;
      roomData.updatedAt = Date.now();
    } else if (action === "clear") {
      roomData.currentAnswer = null;
      roomData.answerStatus = "waiting";
      roomData.typingPlayer = null;
    } else {
      return { success: false, errMsg: "无效的 action" };
    }

    // 删除只读字段后 set 回去
    delete roomData._id;
    delete roomData._openid;

    await db.collection("rooms").doc(roomId).set({
      data: roomData,
    });

    return { success: true };
  } catch (e) {
    console.error("submitAnswer error:", e);
    return { success: false, errMsg: e.message || String(e) };
  }
};
