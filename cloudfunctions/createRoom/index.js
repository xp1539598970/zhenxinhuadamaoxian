const cloud = require("wx-server-sdk");
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();

function generateRoomCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openId = wxContext.OPENID;
  
  const { roomName = "真心话大冒险", maxPlayers = 6, nickName = "", avatarUrl = "", duration = 0 } = event;

  // 生成一个唯一默认昵称，避免多人都叫"玩家"无法区分
  let finalNickName = (nickName || "").trim();
  if (!finalNickName || finalNickName === "玩家") {
    const suffix = Math.floor(Math.random() * 9000 + 1000);
    finalNickName = "玩家" + suffix;
  }

  let roomCode = generateRoomCode();
  let exists = true;
  
  while (exists) {
    const res = await db.collection("rooms").where({ roomCode }).get();
    if (res.data.length === 0) {
      exists = false;
    } else {
      roomCode = generateRoomCode();
    }
  }

  try {
    const roomData = {
      roomName,
      roomCode,
      ownerOpenId: openId,
      ownerNickName: finalNickName,
      ownerAvatarUrl: avatarUrl,
      maxPlayers,
      duration,
      currentPlayerIndex: 0,
      gameStatus: "waiting",
      createdAt: db.serverDate(),
      updatedAt: db.serverDate(),
    };

    if (duration > 0) {
      roomData.endTime = new Date(Date.now() + duration * 60 * 1000);
    }

    const roomRes = await db.collection("rooms").add({
      data: roomData,
    });

    const roomId = roomRes._id;

    await db.collection("players").add({
      data: {
        roomId,
        openId,
        nickName: finalNickName,
        avatarUrl,
        isReady: false,
        order: 0,
        joinedAt: db.serverDate(),
      },
    });

    return {
      success: true,
      data: {
        roomId,
        roomCode,
      },
    };
  } catch (e) {
    return {
      success: false,
      errMsg: e.message,
    };
  }
};
