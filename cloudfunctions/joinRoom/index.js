const cloud = require("wx-server-sdk");
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openId = wxContext.OPENID;
  
  const { roomCode, nickName = "", avatarUrl = "" } = event;

  // 生成一个唯一默认昵称，避免多人都叫"玩家"无法区分
  let finalNickName = (nickName || "").trim();
  if (!finalNickName || finalNickName === "玩家") {
    const suffix = Math.floor(Math.random() * 9000 + 1000);
    finalNickName = "玩家" + suffix;
  }

  try {
    const roomRes = await db.collection("rooms").where({ roomCode }).get();
    
    if (roomRes.data.length === 0) {
      return {
        success: false,
        errMsg: "房间不存在",
      };
    }

    const room = roomRes.data[0];
    
    if (room.gameStatus === "ended") {
      return {
        success: false,
        errMsg: "房间已结束",
      };
    }

    const playersRes = await db.collection("players").where({ roomId: room._id }).get();
    const players = playersRes.data;

    const existingPlayer = players.find((p) => p.openId === openId);
    if (existingPlayer) {
      return {
        success: false,
        errMsg: "您已在房间内",
      };
    }

    if (players.length >= room.maxPlayers) {
      return {
        success: false,
        errMsg: "房间已满",
      };
    }

    await db.collection("players").add({
      data: {
        roomId: room._id,
        openId,
        nickName: finalNickName,
        avatarUrl,
        isReady: false,
        order: players.length,
        joinedAt: db.serverDate(),
      },
    });

    return {
      success: true,
      data: {
        roomId: room._id,
        roomCode: room.roomCode,
      },
    };
  } catch (e) {
    return {
      success: false,
      errMsg: e.message,
    };
  }
};
