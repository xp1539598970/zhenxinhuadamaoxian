// app.js
App({
  onLaunch: function () {
    this.globalData = {
      env: "cloud1-d6gv09q2937099150",
      userInfo: null,
      openId: null,
    };
    if (!wx.cloud) {
      console.error("请使用 2.2.3 或以上的基础库以使用云能力");
    } else {
      wx.cloud.init({
        env: this.globalData.env,
        traceUser: true,
      });
    }
    this.getUserInfo();
    this.getOpenId();
  },

  async getUserInfo() {
    try {
      const res = await wx.getUserProfile({
        desc: "用于展示用户信息",
      });
      this.globalData.userInfo = res.userInfo;
    } catch (e) {
      console.log("获取用户信息失败", e);
    }
  },

  async getOpenId() {
    try {
      const res = await wx.cloud.callFunction({
        name: "getOpenId",
      });
      this.globalData.openId = res.result.openid;
    } catch (e) {
      console.log("获取OpenId失败", e);
    }
  },
});
