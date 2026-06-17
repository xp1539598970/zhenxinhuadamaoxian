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

    let remainingTime = null;
    if (room.duration > 0 && room.gameStatus === "playing" && room.endTime) {
      const now = Date.now();
      const end = new Date(room.endTime).getTime();
      remainingTime = Math.max(0, Math.floor((end - now) / 1000));
    }

    return {
      success: true,
      data: {
        room,
        players,
        remainingTime,
      },
    };
  } catch (e) {
    return {
      success: false,
      errMsg: e.message,
    };
  }
};
