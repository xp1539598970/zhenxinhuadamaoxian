// join.js
Page({
  data: {
    roomCode: "",
    isJoining: false,
  },

  onLoad: function (options) {
    if (options.roomCode) {
      this.setData({ roomCode: options.roomCode });
    }
  },

  onInputRoomCode: function (e) {
    var value = e.detail.value || "";
    value = value.replace(/[^\d]/g, "").slice(0, 6);
    this.setData({
      roomCode: value,
    });
  },

  onJoinRoom: async function () {
    if (this.data.isJoining) return;
    if (this.data.roomCode.length !== 6) {
      wx.showToast({
        title: "请输入6位房间号",
        icon: "none",
      });
      return;
    }

    const app = getApp();
    let nickName = "玩家";
    let avatarUrl = "";

    if (app.globalData.userInfo) {
      nickName = app.globalData.userInfo.nickName;
      avatarUrl = app.globalData.userInfo.avatarUrl;
    }

    this.setData({ isJoining: true });
    wx.showLoading({ title: "加入中..." });

    try {
      const res = await wx.cloud.callFunction({
        name: "joinRoom",
        data: {
          roomCode: this.data.roomCode,
          nickName,
          avatarUrl,
        },
      });

      wx.hideLoading();
      if (res.result && res.result.success) {
        wx.showToast({
          title: "加入成功",
          icon: "success",
        });
        wx.navigateTo({
          url: "/pages/room/index?roomId=" + res.result.data.roomId,
        });
      } else {
        wx.showToast({
          title: (res.result && res.result.errMsg) || "加入失败",
          icon: "none",
        });
      }
    } catch (e) {
      wx.hideLoading();
      console.error("加入房间失败", e);
      wx.showToast({
        title: "加入失败，请重试",
        icon: "none",
      });
    } finally {
      this.setData({ isJoining: false });
    }
  },
});
