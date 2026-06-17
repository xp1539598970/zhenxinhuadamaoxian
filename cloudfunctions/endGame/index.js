const cloud = require("wx-server-sdk");
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openId = wxContext.OPENID;
  
  const { roomId, action = "manual" } = event;

  try {
    const roomRes = await db.collection("rooms").doc(roomId).get();
    const room = roomRes.data;

    if (action !== "timeout" && room.ownerOpenId !== openId) {
      return {
        success: false,
        errMsg: "只有房主可以结束游戏",
      };
    }

    const playersRes = await db.collection("players").where({ roomId }).get();
    const players = playersRes.data;

    await db.collection("rooms").doc(roomId).update({
      data: {
        gameStatus: "ended",
        updatedAt: db.serverDate(),
      },
    });

    const playerNames = players.map((p) => p.nickName);

    await db.collection("gameRecords").add({
      data: {
        roomId,
        roomCode: room.roomCode,
        players: playerNames,
        questionCount: 0,
        startTime: room.createdAt,
        endTime: db.serverDate(),
        duration: Math.floor((Date.now() - new Date(room.createdAt).getTime()) / 60000),
        endReason: action,
      },
    });

    return {
      success: true,
      data: {
        gameStatus: "ended",
      },
    };
  } catch (e) {
    return {
      success: false,
      errMsg: e.message,
    };
  }
};
