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

    if (room.ownerOpenId === openId) {
      await db.collection("rooms").doc(roomId).update({
        data: {
          gameStatus: "ended",
          updatedAt: db.serverDate(),
        },
      });

      await db.collection("players").where({ roomId }).remove();

      return {
        success: true,
        isOwner: true,
        data: "房主已退出，房间已解散",
      };
    } else {
      await db.collection("players").where({ roomId, openId }).remove();

      return {
        success: true,
        isOwner: false,
        data: "退出成功",
      };
    }
  } catch (e) {
    return {
      success: false,
      errMsg: e.message,
    };
  }
};
