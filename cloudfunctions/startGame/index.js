const cloud = require("wx-server-sdk");
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openId = wxContext.OPENID;
  
  const { roomId } = event;

  try {
    const roomRes = await db.collection("rooms").doc(roomId).get();
    const room = roomRes.data;

    if (room.ownerOpenId !== openId) {
      return {
        success: false,
        errMsg: "只有房主可以开始游戏",
      };
    }

    const playersRes = await db.collection("players").where({ roomId }).get();
    const players = playersRes.data;

    if (players.length < 2) {
      return {
        success: false,
        errMsg: "至少需要2名玩家才能开始游戏",
      };
    }

    await db.collection("rooms").doc(roomId).update({
      data: {
        gameStatus: "playing",
        currentPlayerIndex: 0,
        currentQuestion: null,
        updatedAt: db.serverDate(),
      },
    });

    return {
      success: true,
      data: {
        gameStatus: "playing",
        currentPlayerIndex: 0,
      },
    };
  } catch (e) {
    return {
      success: false,
      errMsg: e.message,
    };
  }
};
