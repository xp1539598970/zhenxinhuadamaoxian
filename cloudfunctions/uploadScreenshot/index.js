const cloud = require("wx-server-sdk");
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openId = wxContext.OPENID;

  const { fileID, roomId, roomCode, players } = event;

  if (!fileID || !roomId) {
    return {
      success: false,
      errMsg: "缺少必要参数",
    };
  }

  try {
    await db.collection("gameScreenshots").add({
      data: {
        fileID,
        roomId,
        roomCode: roomCode || "",
        players: players || [],
        openId,
        createdAt: db.serverDate(),
      },
    });

    return {
      success: true,
      data: { fileID },
    };
  } catch (e) {
    return {
      success: false,
      errMsg: e.message || String(e),
    };
  }
};
