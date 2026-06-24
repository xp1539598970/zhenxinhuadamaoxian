// app.js
App({
  onLaunch: function () {
    this.globalData = {
      env: "cloud1-d6gv09q2937099150",
      userInfo: null,
      openId: null,
    };

    // 优先从本地缓存读取用户信息
    const cachedUser = wx.getStorageSync("userInfo");
    if (cachedUser) {
      this.globalData.userInfo = cachedUser;
    }

    if (!wx.cloud) {
      console.error("请使用 2.2.3 或以上的基础库以使用云能力");
    } else {
      wx.cloud.init({
        env: this.globalData.env,
        traceUser: true,
      });
    }

    this.getOpenId();
    this.getUserInfo();
  },

  async getUserInfo() {
    try {
      const res = await wx.getUserProfile({
        desc: "用于展示用户信息",
      });
      this.globalData.userInfo = res.userInfo;
      // 缓存到本地
      wx.setStorageSync("userInfo", res.userInfo);
      // 同步到云数据库
      this.saveUserProfile(res.userInfo);
    } catch (e) {
      console.log("获取用户信息失败", e);
      // 用户拒绝授权时，使用缓存或默认值
      if (!this.globalData.userInfo) {
        this.globalData.userInfo = {
          nickName: "微信用户",
          avatarUrl: "/images/avatar.png",
        };
      }
    }
  },

  async saveUserProfile(userInfo) {
    try {
      const db = wx.cloud.database();
      const openId = this.globalData.openId;
      if (!openId) return;

      const res = await db.collection("userProfiles").where({
        _openid: openId,
      }).get();

      if (res.data.length > 0) {
        await db.collection("userProfiles").doc(res.data[0]._id).update({
          data: {
            nickName: userInfo.nickName,
            avatarUrl: userInfo.avatarUrl,
            updatedAt: db.serverDate(),
          },
        });
      } else {
        await db.collection("userProfiles").add({
          data: {
            nickName: userInfo.nickName,
            avatarUrl: userInfo.avatarUrl,
            createdAt: db.serverDate(),
            updatedAt: db.serverDate(),
          },
        });
      }
    } catch (e) {
      console.log("保存用户档案失败", e);
    }
  },

  async getOpenId() {
    try {
      const res = await wx.cloud.callFunction({
        name: "getOpenId",
      });
      this.globalData.openId = res.result.openid;
      // 如果已有用户信息，保存档案
      if (this.globalData.userInfo) {
        this.saveUserProfile(this.globalData.userInfo);
      }
    } catch (e) {
      console.log("获取OpenId失败", e);
    }
  },
});
