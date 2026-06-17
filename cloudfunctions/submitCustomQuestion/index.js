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
    // 校验参数
    if (!roomId || !targetPlayerId || !questionType || !content) {
      return {
        success: false,
        errMsg: "缺少必要参数",
      };
    }

    if (questionType !== "truth" && questionType !== "dare") {
      return {
        success: false,
        errMsg: "questionType 必须是 truth 或 dare",
      };
    }

    // 校验房间存在且状态为 playing
    const roomRes = await db.collection("rooms").doc(roomId).get();
    if (!roomRes.data) {
      return {
        success: false,
        errMsg: "房间不存在",
      };
    }

    const room = roomRes.data;
    if (room.gameStatus !== "playing") {
      return {
        success: false,
        errMsg: "房间状态不是 playing",
      };
    }

    // 校验目标玩家存在且属于该房间
    const targetPlayerRes = await db.collection("players").doc(targetPlayerId).get();
    if (!targetPlayerRes.data) {
      return {
        success: false,
        errMsg: "目标玩家不存在",
      };
    }

    const targetPlayer = targetPlayerRes.data;
    if (targetPlayer.roomId !== roomId) {
      return {
        success: false,
        errMsg: "目标玩家不属于该房间",
      };
    }

    // 获取提问者信息
    const fromPlayerRes = await db.collection("players").where({
      roomId: roomId,
      openId: openId,
    }).get();

    if (fromPlayerRes.data.length === 0) {
      return {
        success: false,
        errMsg: "您不在该房间内",
      };
    }

    const fromPlayer = fromPlayerRes.data[0];

    // 构建自定义问题对象
    const question = {
      content: content,
      type: questionType,
      difficulty: 0,
      isCustom: true,
      fromPlayer: fromPlayer.nickName,
      targetPlayer: targetPlayer.nickName,
    };

    // 更新房间的 currentQuestion 字段
    await db.collection("rooms").doc(roomId).update({
      data: {
        currentQuestion: question,
      },
    });

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
