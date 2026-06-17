const cloud = require("wx-server-sdk");
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();

exports.main = async (event, context) => {
  const { roomId } = event;

  try {
    const roomRes = await db.collection("rooms").doc(roomId).get();
    const room = roomRes.data;

    const playersRes = await db
      .collection("players")
      .where({ roomId })
      .orderBy("order", "asc")
      .get();
    const players = playersRes.data;

    if (players.length === 0) {
      return {
        success: false,
        errMsg: "房间内没有玩家",
      };
    }

    let nextIndex = (room.currentPlayerIndex + 1) % players.length;

    await db.collection("rooms").doc(roomId).update({
      data: {
        currentPlayerIndex: nextIndex,
        currentQuestion: null,
        updatedAt: db.serverDate(),
      },
    });

    return {
      success: true,
      data: {
        currentPlayerIndex: nextIndex,
        currentPlayer: players[nextIndex],
      },
    };
  } catch (e) {
    return {
      success: false,
      errMsg: e.message,
    };
  }
};
