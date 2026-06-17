// index.js
Page({
  data: {
    showTip: false,
    title: "",
    content: "",
  },

  onLoad: function () {
    const app = getApp();
    if (!app.globalData.env) {
      this.setData({
        showTip: true,
        title: "环境未配置",
        content: "请在 app.js 中配置云环境 ID",
      });
    }
  },

  onCreateRoom: function () {
    wx.navigateTo({
      url: "/pages/create/index",
    });
  },

  onJoinRoom: function () {
    wx.navigateTo({
      url: "/pages/join/index",
    });
  },
});
