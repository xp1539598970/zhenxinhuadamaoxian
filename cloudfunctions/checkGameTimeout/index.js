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

    if (!room || room.gameStatus !== "playing") {
      return {
        success: true,
        isTimeout: false,
      };
    }

    if (!room.duration || room.duration <= 0) {
      return {
        success: true,
        isTimeout: false,
      };
    }

    if (room.endTime) {
      const endTime = new Date(room.endTime).getTime();

      if (Date.now() >= endTime) {
        await db.collection("rooms").doc(roomId).update({
          data: {
            gameStatus: "ended",
            updatedAt: db.serverDate(),
          },
        });

        const playersRes = await db.collection("players").where({ roomId }).get();
        const players = playersRes.data;
        const playerNames = players.map((p) => p.nickName);

        await db.collection("gameRecords").add({
          data: {
            roomId,
            roomCode: room.roomCode,
            players: playerNames,
            questionCount: 0,
            startTime: room.createdAt,
            endTime: db.serverDate(),
            duration: room.duration,
            endReason: "timeout",
          },
        });

        return {
          success: true,
          isTimeout: true,
        };
      }
    }

    return {
      success: true,
      isTimeout: false,
    };
  } catch (e) {
    return {
      success: false,
      errMsg: e.message,
    };
  }
};
