// index.js
Page({
  data: {
    showTip: false,
    title: "",
    content: "",
    userInfo: null,
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
    if (app.globalData.userInfo) {
      this.setData({ userInfo: app.globalData.userInfo });
    }
  },

  onShow: function () {
    const app = getApp();
    if (app.globalData.userInfo) {
      this.setData({ userInfo: app.globalData.userInfo });
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

  onShareAppMessage: function () {
    return {
      title: "真心话大冒险 - 聚会必备，快乐无限！",
      path: "/pages/index/index",
    };
  },
});
