// create.js
Page({
  data: {
    roomName: "",
    maxPlayers: 6,
    playerOptions: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    duration: 30,
    durationOptions: [10, 20, 30, 60, 0],
    durationLabels: ["10分钟", "20分钟", "30分钟", "60分钟", "不限时"],
    durationIndex: 2,
    userInfo: null,
    isCreating: false,
  },

  onLoad: function () {
    const app = getApp();
    if (app.globalData.userInfo) {
      this.setData({
        userInfo: app.globalData.userInfo,
      });
    }
  },

  onInputRoomName: function (e) {
    this.setData({
      roomName: e.detail.value,
    });
  },

  onPickerChange: function (e) {
    this.setData({
      maxPlayers: this.data.playerOptions[e.detail.value],
    });
  },

  onDurationChange: function (e) {
    const index = e.detail.value;
    this.setData({
      durationIndex: index,
      duration: this.data.durationOptions[index],
    });
  },

  onCreateRoom: async function () {
    if (this.data.isCreating) return;

    const app = getApp();
    let nickName = "玩家";
    let avatarUrl = "";

    if (app.globalData.userInfo) {
      nickName = app.globalData.userInfo.nickName;
      avatarUrl = app.globalData.userInfo.avatarUrl;
    }

    this.setData({ isCreating: true });
    wx.showLoading({ title: "创建中..." });

    try {
      const res = await wx.cloud.callFunction({
        name: "createRoom",
        data: {
          roomName: this.data.roomName || "真心话大冒险",
          maxPlayers: this.data.maxPlayers,
          duration: this.data.duration,
          nickName,
          avatarUrl,
        },
      });

      wx.hideLoading();
      if (res.result && res.result.success) {
        wx.showToast({
          title: "创建成功",
          icon: "success",
        });
        wx.navigateTo({
          url: `/pages/room/index?roomId=${res.result.data.roomId}`,
        });
      } else {
        wx.showToast({
          title: (res.result && res.result.errMsg) || "创建失败",
          icon: "none",
        });
      }
    } catch (e) {
      wx.hideLoading();
      console.error("创建房间失败", e);
      wx.showToast({
        title: "创建失败，请重试",
        icon: "none",
      });
    } finally {
      this.setData({ isCreating: false });
    }
  },
});
