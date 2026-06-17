// room.js
Page({
  data: {
    roomId: "",
    roomName: "",
    roomCode: "",
    gameStatus: "",
    maxPlayers: 6,
    players: [],
    playerCount: 0,
    currentQuestion: null,
    isOwner: false,
    refreshTimer: null,
    remainingTime: null,
    countdownTimer: null,
    hasEnded: false,
    countdownText: "",
    // 自定义提问相关
    showAskModal: false,
    askTargetIndex: 0,
    askType: "truth",
    askContent: "",
  },

  onLoad: function (options) {
    const { roomId } = options;
    this.setData({ roomId });
    this.loadRoomInfo();
    this.startRefresh();
  },

  onUnload: function () {
    if (this.data.refreshTimer) {
      clearInterval(this.data.refreshTimer);
    }
    if (this.data.countdownTimer) {
      clearInterval(this.data.countdownTimer);
    }
  },

  startRefresh: function () {
    this.data.refreshTimer = setInterval(() => {
      this.loadRoomInfo();
    }, 3000);
  },

  loadRoomInfo: async function () {
    try {
      const res = await wx.cloud.callFunction({
        name: "getRoomInfo",
        data: {
          roomId: this.data.roomId,
        },
      });

      if (res.result.success) {
        const { room, players, remainingTime } = res.result.data;

        const app = getApp();
        const isOwner = room.ownerOpenId === app.globalData.openId;

        const processedPlayers = players.map((player, index) => ({
          ...player,
          isOwner: player.openId === room.ownerOpenId,
          isCurrent: room.currentPlayerIndex === index && room.gameStatus === "playing",
        }));

        this.setData({
          roomName: room.roomName || "",
          roomCode: room.roomCode || "",
          gameStatus: room.gameStatus || "",
          maxPlayers: room.maxPlayers || 6,
          players: processedPlayers,
          playerCount: players.length,
          isOwner,
          remainingTime,
          currentQuestion: room.currentQuestion || null,
        });

        // 启动或清除倒计时
        if (remainingTime !== null && remainingTime > 0 && room.gameStatus === "playing") {
          this.startCountdown();
        } else {
          if (this.data.countdownTimer) {
            clearInterval(this.data.countdownTimer);
            this.setData({ countdownTimer: null });
          }
          if (remainingTime !== null && remainingTime <= 0 && room.gameStatus === "playing") {
            this.checkTimeout();
          }
        }

        if (room.gameStatus === "ended" && !this.data.hasEnded) {
          this.setData({ hasEnded: true });
          wx.showModal({
            title: "房间已结束",
            content: "房间已被房主解散或游戏已结束",
            showCancel: false,
            success: () => {
              wx.navigateBack();
            },
          });
        }
      }
    } catch (e) {
      console.error("获取房间信息失败", e);
    }
  },

  onStartGame: async function () {
    if (this.data.players.length < 2) {
      wx.showToast({
        title: "至少需要2名玩家",
        icon: "none",
      });
      return;
    }

    try {
      const res = await wx.cloud.callFunction({
        name: "startGame",
        data: {
          roomId: this.data.roomId,
        },
      });

      if (res.result.success) {
        await this.loadRoomInfo();
        await this.getQuestion();
      } else {
        wx.showToast({
          title: res.result.errMsg || "开始游戏失败",
          icon: "none",
        });
      }
    } catch (e) {
      console.error("开始游戏失败", e);
      wx.showToast({
        title: "开始游戏失败",
        icon: "none",
      });
    }
  },

  getQuestion: async function () {
    try {
      const res = await wx.cloud.callFunction({
        name: "getQuestion",
        data: {
          type: "random",
          roomId: this.data.roomId,
        },
      });

      if (res.result.success) {
        this.setData({
          currentQuestion: res.result.data,
        });
      } else {
        wx.showToast({
          title: res.result.errMsg || "获取题目失败",
          icon: "none",
        });
      }
    } catch (e) {
      console.error("获取题目失败", e);
    }
  },

  onNextPlayer: async function () {
    try {
      const res = await wx.cloud.callFunction({
        name: "nextPlayer",
        data: {
          roomId: this.data.roomId,
        },
      });

      if (res.result.success) {
        await this.loadRoomInfo();
        await this.getQuestion();
      } else {
        wx.showToast({
          title: res.result.errMsg || "切换玩家失败",
          icon: "none",
        });
      }
    } catch (e) {
      console.error("切换玩家失败", e);
    }
  },

  onEndGame: async function () {
    wx.showModal({
      title: "确认结束",
      content: "确定要结束游戏吗？",
      success: async (modalRes) => {
        if (modalRes.confirm) {
          try {
            const res = await wx.cloud.callFunction({
              name: "endGame",
              data: {
                roomId: this.data.roomId,
              },
            });

            if (res.result.success) {
              wx.showToast({
                title: "游戏已结束",
                icon: "success",
              });
              setTimeout(() => {
                wx.navigateBack();
              }, 1500);
            } else {
              wx.showToast({
                title: res.result.errMsg || "结束游戏失败",
                icon: "none",
              });
            }
          } catch (e) {
            console.error("结束游戏失败", e);
          }
        }
      },
    });
  },

  onExitRoom: async function () {
    wx.showModal({
      title: "确认退出",
      content: "确定要退出房间吗？",
      success: async (modalRes) => {
        if (modalRes.confirm) {
          try {
            const res = await wx.cloud.callFunction({
              name: "exitRoom",
              data: {
                roomId: this.data.roomId,
              },
            });

            if (res.result.success) {
              wx.showToast({
                title: res.result.isOwner ? "房间已解散" : "退出成功",
                icon: "success",
              });
              setTimeout(() => {
                wx.navigateBack();
              }, 1500);
            } else {
              wx.showToast({
                title: res.result.errMsg || "退出失败",
                icon: "none",
              });
            }
          } catch (e) {
            console.error("退出房间失败", e);
          }
        }
      },
    });
  },

  onSkipQuestion: async function () {
    await this.getQuestion();
  },

  startCountdown: function () {
    if (this.data.countdownTimer) {
      clearInterval(this.data.countdownTimer);
      this.setData({ countdownTimer: null });
    }

    const formatTime = (seconds) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    this.setData({
      countdownText: formatTime(this.data.remainingTime),
    });

    const timer = setInterval(() => {
      const newTime = this.data.remainingTime - 1;

      if (newTime <= 0) {
        clearInterval(timer);
        this.setData({
          countdownTimer: null,
          remainingTime: 0,
          countdownText: "0:00",
        });
        this.checkTimeout();
      } else {
        this.setData({
          remainingTime: newTime,
          countdownText: formatTime(newTime),
        });
      }
    }, 1000);

    this.setData({ countdownTimer: timer });
  },

  checkTimeout: async function () {
    if (this.data.hasEnded) return;

    try {
      const res = await wx.cloud.callFunction({
        name: "checkGameTimeout",
        data: {
          roomId: this.data.roomId,
        },
      });

      if (res.result.success && res.result.isTimeout) {
        this.setData({ hasEnded: true });
        wx.showModal({
          title: "游戏时间已到",
          content: "游戏时间已结束，请继续下一步操作",
          showCancel: false,
          success: () => {
            wx.navigateBack();
          },
        });
      }
    } catch (e) {
      console.error("检查超时失败", e);
    }
  },

  onShareAppMessage: function () {
    return {
      title: this.data.roomName + " - 快来一起玩真心话大冒险！",
      path: "/pages/join/index?roomCode=" + this.data.roomCode,
      imageUrl: "",
    };
  },

  // ========== 自定义提问功能 ==========

  onShowAskModal: function () {
    if (this.data.gameStatus !== "playing") {
      wx.showToast({
        title: "游戏进行中才能提问",
        icon: "none",
      });
      return;
    }
    this.setData({
      showAskModal: true,
      askTargetIndex: 0,
      askType: "truth",
      askContent: "",
    });
  },

  onHideAskModal: function () {
    this.setData({ showAskModal: false });
  },

  onAskTypeChange: function (e) {
    this.setData({ askType: e.currentTarget.dataset.type });
  },

  onAskTargetChange: function (e) {
    this.setData({ askTargetIndex: parseInt(e.detail.value) });
  },

  onAskContentInput: function (e) {
    this.setData({ askContent: e.detail.value });
  },

  onSubmitCustomQuestion: async function () {
    const content = this.data.askContent.trim();
    if (!content) {
      wx.showToast({
        title: "请输入问题内容",
        icon: "none",
      });
      return;
    }

    const targetPlayer = this.data.players[this.data.askTargetIndex];
    if (!targetPlayer) {
      wx.showToast({
        title: "请选择目标玩家",
        icon: "none",
      });
      return;
    }

    try {
      const res = await wx.cloud.callFunction({
        name: "submitCustomQuestion",
        data: {
          roomId: this.data.roomId,
          targetPlayerId: targetPlayer._id,
          questionType: this.data.askType,
          content: content,
        },
      });

      if (res.result.success) {
        this.setData({
          showAskModal: false,
          askContent: "",
        });
        wx.showToast({
          title: "提问成功",
          icon: "success",
        });
        // 刷新房间信息，所有人会看到新题目
        await this.loadRoomInfo();
      } else {
        wx.showToast({
          title: res.result.errMsg || "提问失败",
          icon: "none",
        });
      }
    } catch (e) {
      console.error("提交自定义问题失败", e);
      wx.showToast({
        title: "提问失败，请重试",
        icon: "none",
      });
    }
  },
});
