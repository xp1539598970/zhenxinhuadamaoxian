// profile.js
Page({
  data: {
    userInfo: null,
    openId: null,
    gameRecords: [],
    screenshots: [],
    isLoadingRecords: true,
    isLoadingScreenshots: true,
  },

  onLoad: function () {
    const app = getApp();
    this.setData({
      userInfo: app.globalData.userInfo,
      openId: app.globalData.openId,
    });
    this.loadGameRecords();
    this.loadScreenshots();
  },

  onShow: function () {
    const app = getApp();
    if (app.globalData.userInfo) {
      this.setData({ userInfo: app.globalData.userInfo });
    }
    this.loadGameRecords();
    this.loadScreenshots();
  },

  loadGameRecords: async function () {
    this.setData({ isLoadingRecords: true });
    try {
      const db = wx.cloud.database();
      const res = await db
        .collection("gameRecords")
        .orderBy("endTime", "desc")
        .limit(20)
        .get();

      const records = (res.data || []).map((r) => ({
        ...r,
        timeStr: this.formatTime(r.endTime),
        durationStr: r.duration ? r.duration + "分钟" : "不限时",
      }));

      this.setData({ gameRecords: records });
    } catch (e) {
      console.error("加载游戏记录失败", e);
      wx.showToast({ title: "加载记录失败", icon: "none" });
    } finally {
      this.setData({ isLoadingRecords: false });
    }
  },

  loadScreenshots: async function () {
    this.setData({ isLoadingScreenshots: true });
    try {
      const db = wx.cloud.database();
      const res = await db
        .collection("gameScreenshots")
        .orderBy("createdAt", "desc")
        .limit(20)
        .get();

      const screenshots = res.data || [];
      this.setData({ screenshots });

      if (screenshots.length > 0) {
        this.loadScreenshotUrls(screenshots);
      }
    } catch (e) {
      console.error("加载截图失败", e);
    } finally {
      this.setData({ isLoadingScreenshots: false });
    }
  },

  loadScreenshotUrls: async function (screenshots) {
    try {
      const fileList = screenshots.map((s) => s.fileID);
      const res = await wx.cloud.callFunction({
        name: "getImageUrl",
        data: { fileList },
      });

      if (res.result && res.result.success) {
        const urlMap = {};
        res.result.fileList.forEach((item) => {
          urlMap[item.fileID] = item.tempFileURL;
        });

        const updatedScreenshots = screenshots.map((s) => ({
          ...s,
          tempUrl: urlMap[s.fileID] || "",
        }));

        this.setData({ screenshots: updatedScreenshots });
      }
    } catch (e) {
      console.error("获取截图链接失败", e);
    }
  },

  formatTime: function (date) {
    if (!date) return "";
    const d = new Date(date);
    const pad = (n) => n.toString().padStart(2, "0");
    return (
      d.getFullYear() +
      "-" +
      pad(d.getMonth() + 1) +
      "-" +
      pad(d.getDate()) +
      " " +
      pad(d.getHours()) +
      ":" +
      pad(d.getMinutes())
    );
  },

  onPreviewImage: function (e) {
    const url = e.currentTarget.dataset.url;
    if (url) {
      wx.previewImage({
        current: url,
        urls: [url],
      });
    }
  },

  onClearCache: function () {
    wx.showModal({
      title: "清除缓存",
      content: "确定要清除本地缓存吗？",
      success: (res) => {
        if (res.confirm) {
          wx.clearStorageSync();
          wx.showToast({ title: "缓存已清除", icon: "success" });
        }
      },
    });
  },

  onShareAppMessage: function () {
    return {
      title: "真心话大冒险 - 聚会必备",
      path: "/pages/index/index",
    };
  },
});
