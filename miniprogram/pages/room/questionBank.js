// 本地题库（随机抽题用，避免云数据库并发写入冲突）
const TRUTH_QUESTIONS = [
  "你最尴尬的一件事是什么？",
  "你暗恋过哪些人？",
  "你做过最疯狂的事是什么？",
  "你觉得自己最大的缺点是什么？",
  "如果可以回到过去，你想改变什么？",
  "你最害怕什么？",
  "你有没有撒过一个至今未被发现的谎？",
  "你最喜欢的异性类型是什么？",
  "说一件你从未告诉过任何人的秘密。",
  "你人生中最后悔的一个决定是什么？",
];

const DARE_QUESTIONS = [
  "模仿一种动物的叫声，让大家猜是什么动物。",
  "给通讯录里第5个人打电话，说一句“我想你了”。",
  "做10个俯卧撑。",
  "对着窗外大喊三声“我是最棒的”。",
  "选在场的一位异性，深情对视10秒。",
  "跳一段舞，不管跳得好不好。",
  "用屁股写字，让大家猜是什么字。",
  "给最近联系的朋友发一条“我爱你”。",
  "对身边的人说三句赞美的话。",
  "讲一个自己的丑事，越详细越好。",
];

const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

const buildRandomQuestion = () => {
  const isTruth = Math.random() > 0.5;
  return {
    _id: "q_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8),
    content: isTruth ? pickRandom(TRUTH_QUESTIONS) : pickRandom(DARE_QUESTIONS),
    type: isTruth ? "truth" : "dare",
    difficulty: [1, 2, 3][Math.floor(Math.random() * 3)],
    category: isTruth ? "随机真心话" : "随机大冒险",
    isActive: true,
    isCustom: false,
  };
};

module.exports = {
  TRUTH_QUESTIONS,
  DARE_QUESTIONS,
  pickRandom,
  buildRandomQuestion,
};
