const cloud = require("wx-server-sdk");
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openId = wxContext.OPENID;

  const { roomId, targetPlayerId, questionType, content } = event;

  try {
    if (!roomId || !targetPlayerId || !questionType || !content) {
      return { success: false, errMsg: "缺少必要参数" };
    }

    if (questionType !== "truth" && questionType !== "dare") {
      return { success: false, errMsg: "questionType 必须是 truth 或 dare" };
    }

    // 查找目标玩家
    const targetPlayerRes = await db.collection("players").doc(targetPlayerId).get();
    if (!targetPlayerRes.data) {
      return { success: false, errMsg: "目标玩家不存在" };
    }
    const targetPlayer = targetPlayerRes.data;

    // 查找提问者
    const fromPlayerRes = await db.collection("players").where({
      roomId: roomId,
      openId: openId,
    }).get();

    if (fromPlayerRes.data.length === 0) {
      return { success: false, errMsg: "您不在该房间内" };
    }
    const fromPlayer = fromPlayerRes.data[0];

    const question = {
      content: content,
      type: questionType,
      difficulty: 0,
      category: "自定义",
      isActive: true,
      isCustom: true,
      fromPlayer: event.fromPlayerName || fromPlayer.nickName || "玩家",
      targetPlayer: event.targetPlayerName || targetPlayer.nickName || "玩家",
      createdAt: Date.now(),
    };

    // 先读取完整文档，再 set 回去（避免 update 权限问题）
    const roomRes = await db.collection("rooms").doc(roomId).get();
    const roomData = roomRes.data;
    // 删除只读字段，set() 不允许写入 _id 和 _openid
    delete roomData._id;
    delete roomData._openid;
    roomData.currentQuestion = question;
    roomData.updatedAt = Date.now();
    
    await db.collection("rooms").doc(roomId).set({
      data: roomData,
    });

    return { success: true, data: question };
  } catch (e) {
    console.error("submitCustomQuestion error:", e);
    return { success: false, errMsg: e.message || String(e) };
  }
};
