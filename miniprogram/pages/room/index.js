// room.js
const { buildRandomQuestion } = require("./questionBank");

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
    isLoadingQuestion: false,
    lastQuestionUpdateAt: 0,
    // 自定义提问相关
    showAskModal: false,
    askTargetIndex: 0,
    askType: "truth",
    askContent: "",
    // 回答相关
    answerContent: "",
    answerStatus: "waiting",
    currentAnswer: null,
    isCurrentPlayer: false,
    currentPlayerName: "",
    myDisplayName: "",
    typingPlayer: "",
    answerDisplayTime: "",
    typingTimer: null,
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

      if (res.result && res.result.success) {
        const { room, players, remainingTime } = res.result.data;
        if (!room) {
          console.warn("房间数据为空");
          return;
        }

        const app = getApp();
        const isOwner = room.ownerOpenId === (app.globalData.openId || "");
        const myOpenId = app.globalData.openId || "";

        const processedPlayers = (players || []).map((player, index) => ({
          ...player,
          displayName: this.getPlayerDisplayName(player, index, players),
          isOwner: player.openId === room.ownerOpenId,
          isCurrent: room.currentPlayerIndex === index && room.gameStatus === "playing",
        }));

        const incomingQuestion = room.currentQuestion;
        let nextQuestion = incomingQuestion && incomingQuestion.content ? incomingQuestion : null;

        if (!nextQuestion && room.gameStatus !== "playing") {
          nextQuestion = null;
        }

        // 判断当前玩家是否是本人
        const currentIndex = room.currentPlayerIndex || 0;
        const currentPlayer = processedPlayers[currentIndex];
        const isCurrentPlayer = currentPlayer && currentPlayer.openId === myOpenId;

        // 找到当前用户自己的 displayName
        const myPlayer = processedPlayers.find(p => p.openId === myOpenId);
        const myDisplayName = myPlayer ? myPlayer.displayName : "";

        // 处理回答状态
        const answerStatus = room.answerStatus || "waiting";
        const currentAnswer = room.currentAnswer || null;
        const typingPlayer = room.typingPlayer || "";
        const currentPlayerName = currentPlayer ? currentPlayer.displayName : "";

        // 格式化回答时间
        let answerDisplayTime = "";
        if (currentAnswer && currentAnswer.submittedAt) {
          const d = new Date(currentAnswer.submittedAt);
          answerDisplayTime = d.getHours().toString().padStart(2, '0') + ":" + d.getMinutes().toString().padStart(2, '0');
        }

        this.setData({
          roomName: room.roomName || "",
          roomCode: room.roomCode || "",
          gameStatus: room.gameStatus || "",
          maxPlayers: room.maxPlayers || 6,
          players: processedPlayers,
          playerCount: (players || []).length,
          isOwner,
          remainingTime,
          currentQuestion: nextQuestion,
          answerStatus: answerStatus,
          currentAnswer: currentAnswer,
          isCurrentPlayer: isCurrentPlayer,
          currentPlayerName: currentPlayerName,
          myDisplayName: myDisplayName,
          typingPlayer: typingPlayer,
          answerDisplayTime: answerDisplayTime,
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

      if (res.result && res.result.success) {
        // 先获取题目（包含将题目写入数据库），再loadRoomInfo，避免竞态被覆盖
        await this.getQuestion();
        await this.loadRoomInfo();
      } else {
        wx.showToast({
          title: (res.result && res.result.errMsg) || "开始游戏失败",
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

  getPlayerDisplayName: function (player, index, players) {
    const raw = (player.nickName || "").trim();
    if (!raw || raw === "玩家") {
      // 默认昵称，用序号区分
      return "玩家" + (index + 1);
    }
    // 检测重名：以 openId 分组看是否有重复的昵称
    const sameNameCount = players.filter(
      (p) => (p.nickName || "").trim() === raw
    ).length;
    if (sameNameCount > 1) {
      return raw + "·" + (index + 1);
    }
    return raw;
  },

  getQuestion: async function () {
    if (this.data.isLoadingQuestion) return;

    this.setData({ isLoadingQuestion: true });
    try {
      // 本地生成随机题目，然后写入数据库，确保所有设备看到同一道题
      const question = buildRandomQuestion();

      // 写入数据库（清除旧回答 + 写入新题目）
      wx.cloud.callFunction({
        name: "submitAnswer",
        data: {
          roomId: this.data.roomId,
          action: "setQuestion",
          question: question,
        },
      }).catch(() => {});

      this.setData({
        currentQuestion: question,
        lastQuestionUpdateAt: Date.now(),
        answerStatus: "waiting",
        currentAnswer: null,
        typingPlayer: "",
        answerContent: "",
        answerDisplayTime: "",
      });
    } catch (e) {
      console.error("生成题目失败", e);
      wx.showToast({
        title: "获取题目失败",
        icon: "none",
      });
    } finally {
      this.setData({ isLoadingQuestion: false });
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

      if (res.result && res.result.success) {
        // 先获取题目再刷新房间信息，避免被数据库延迟覆盖
        await this.getQuestion();
        await this.loadRoomInfo();
      } else {
        wx.showToast({
          title: (res.result && res.result.errMsg) || "切换玩家失败",
          icon: "none",
        });
      }
    } catch (e) {
      console.error("切换玩家失败", e);
      wx.showToast({
        title: "切换玩家失败",
        icon: "none",
      });
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
          fromPlayerName: this.data.myDisplayName || "",
          targetPlayerName: targetPlayer.displayName || "",
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
        title: "提交失败: " + (e.errMsg || e.message || "未知错误"),
        icon: "none",
        duration: 3000,
      });
    }
  },

  // ========== 回答功能 ==========

  onAnswerInput: function (e) {
    const content = e.detail.value;
    this.setData({ answerContent: content });

    // 发送"正在输入"状态（节流：每 2 秒最多发送一次）
    if (content.length > 0 && this.data.answerStatus !== "submitted") {
      const now = Date.now();
      if (!this._lastTypingAt || now - this._lastTypingAt > 2000) {
        this._lastTypingAt = now;
        this.sendTypingStatus();
      }
    }
  },

  onAnswerFocus: function () {
    // 获得焦点时发送"正在输入"
    if (this.data.answerContent.length > 0 && this.data.answerStatus !== "submitted") {
      this.sendTypingStatus();
    }
  },

  sendTypingStatus: async function () {
    try {
      await wx.cloud.callFunction({
        name: "submitAnswer",
        data: {
          roomId: this.data.roomId,
          action: "typing",
        },
      });
    } catch (e) {
      console.error("发送正在输入状态失败", e);
    }
  },

  onSubmitAnswer: async function () {
    const content = this.data.answerContent.trim();
    if (!content) {
      wx.showToast({
        title: "请输入回答内容",
        icon: "none",
      });
      return;
    }

    if (this.data.answerStatus === "submitted") {
      wx.showToast({
        title: "回答已提交",
        icon: "none",
      });
      return;
    }

    try {
      const res = await wx.cloud.callFunction({
        name: "submitAnswer",
        data: {
          roomId: this.data.roomId,
          action: "submit",
          content: content,
        },
      });

      if (res.result.success) {
        wx.showToast({
          title: "回答已提交",
          icon: "success",
        });
        // 刷新房间信息，所有人会看到回答
        await this.loadRoomInfo();
      } else {
        wx.showToast({
          title: res.result.errMsg || "提交失败",
          icon: "none",
        });
      }
    } catch (e) {
      console.error("提交回答失败", e);
      wx.showToast({
        title: "提交失败: " + (e.errMsg || e.message || "未知错误"),
        icon: "none",
        duration: 3000,
      });
    }
  },
});
