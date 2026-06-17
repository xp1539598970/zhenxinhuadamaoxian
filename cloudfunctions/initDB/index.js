const cloud = require("wx-server-sdk");
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();

const TRUTH_QUESTIONS = [
  {
    content: "你最尴尬的一件事是什么？",
    type: "truth",
    difficulty: 1,
    category: "生活",
    isActive: true,
  },
  {
    content: "你暗恋过哪些人？",
    type: "truth",
    difficulty: 2,
    category: "情感",
    isActive: true,
  },
  {
    content: "你做过最疯狂的事是什么？",
    type: "truth",
    difficulty: 2,
    category: "生活",
    isActive: true,
  },
  {
    content: "你觉得自己最大的缺点是什么？",
    type: "truth",
    difficulty: 1,
    category: "自我",
    isActive: true,
  },
  {
    content: "如果可以回到过去，你想改变什么？",
    type: "truth",
    difficulty: 3,
    category: "人生",
    isActive: true,
  },
  {
    content: "你最害怕什么？",
    type: "truth",
    difficulty: 1,
    category: "心理",
    isActive: true,
  },
  {
    content: "你有没有撒过一个至今未被发现的谎？",
    type: "truth",
    difficulty: 3,
    category: "秘密",
    isActive: true,
  },
  {
    content: "你最喜欢的异性类型是什么？",
    type: "truth",
    difficulty: 1,
    category: "情感",
    isActive: true,
  },
];

const DARE_QUESTIONS = [
  {
    content: "模仿一种动物的叫声，让大家猜是什么动物。",
    type: "dare",
    difficulty: 1,
    category: "表演",
    isActive: true,
  },
  {
    content: "给通讯录里第5个人打电话，说一句“我想你了”。",
    type: "dare",
    difficulty: 3,
    category: "挑战",
    isActive: true,
  },
  {
    content: "做10个俯卧撑。",
    type: "dare",
    difficulty: 1,
    category: "运动",
    isActive: true,
  },
  {
    content: "对着窗外大喊三声“我是最棒的”。",
    type: "dare",
    difficulty: 2,
    category: "挑战",
    isActive: true,
  },
  {
    content: "选在场的一位异性，深情对视10秒。",
    type: "dare",
    difficulty: 3,
    category: "互动",
    isActive: true,
  },
  {
    content: "跳一段舞，不管跳得好不好。",
    type: "dare",
    difficulty: 2,
    category: "表演",
    isActive: true,
  },
  {
    content: "用屁股写字，让大家猜是什么字。",
    type: "dare",
    difficulty: 2,
    category: "表演",
    isActive: true,
  },
  {
    content: "给最近联系的朋友发一条“我爱你”。",
    type: "dare",
    difficulty: 3,
    category: "挑战",
    isActive: true,
  },
];

const initDB = async () => {
  const collections = ["rooms", "players", "questions", "gameRecords"];
  
  for (const name of collections) {
    try {
      await db.createCollection(name);
      console.log(`集合 ${name} 创建成功`);
    } catch (e) {
      console.log(`集合 ${name} 已存在或创建失败:`, e);
    }
  }

  try {
    const countRes = await db.collection("questions").count();
    if (countRes.total === 0) {
      const allQuestions = [...TRUTH_QUESTIONS, ...DARE_QUESTIONS];
      for (const question of allQuestions) {
        await db.collection("questions").add({
          data: question,
        });
      }
      console.log("题目数据初始化成功");
    } else {
      console.log(`题目数据已存在，共 ${countRes.total} 条`);
    }
  } catch (e) {
    console.log("题目数据初始化失败:", e);
  }

  return {
    success: true,
    message: "数据库初始化完成",
  };
};

exports.main = async (event, context) => {
  return await initDB();
};
