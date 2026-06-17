const cloud = require("wx-server-sdk");
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();

const TRUTH_QUESTIONS = [
  { content: "你最尴尬的一件事是什么？", type: "truth", difficulty: 1, category: "生活", isActive: true },
  { content: "你暗恋过哪些人？", type: "truth", difficulty: 2, category: "情感", isActive: true },
  { content: "你做过最疯狂的事是什么？", type: "truth", difficulty: 2, category: "生活", isActive: true },
  { content: "你觉得自己最大的缺点是什么？", type: "truth", difficulty: 1, category: "自我", isActive: true },
  { content: "如果可以回到过去，你想改变什么？", type: "truth", difficulty: 3, category: "人生", isActive: true },
  { content: "你最害怕什么？", type: "truth", difficulty: 1, category: "心理", isActive: true },
  { content: "你有没有撒过一个至今未被发现的谎？", type: "truth", difficulty: 3, category: "秘密", isActive: true },
  { content: "你最喜欢的异性类型是什么？", type: "truth", difficulty: 1, category: "情感", isActive: true },
];

const DARE_QUESTIONS = [
  { content: "模仿一种动物的叫声，让大家猜是什么动物。", type: "dare", difficulty: 1, category: "表演", isActive: true },
  { content: "给通讯录里第5个人打电话，说一句“我想你了”。", type: "dare", difficulty: 3, category: "挑战", isActive: true },
  { content: "做10个俯卧撑。", type: "dare", difficulty: 1, category: "运动", isActive: true },
  { content: "对着窗外大喊三声“我是最棒的”。", type: "dare", difficulty: 2, category: "挑战", isActive: true },
  { content: "选在场的一位异性，深情对视10秒。", type: "dare", difficulty: 3, category: "互动", isActive: true },
  { content: "跳一段舞，不管跳得好不好。", type: "dare", difficulty: 2, category: "表演", isActive: true },
  { content: "用屁股写字，让大家猜是什么字。", type: "dare", difficulty: 2, category: "表演", isActive: true },
  { content: "给最近联系的朋友发一条“我爱你”。", type: "dare", difficulty: 3, category: "挑战", isActive: true },
];

const ensureQuestions = async () => {
  try {
    const countRes = await db.collection("questions").count();
    if (countRes.total > 0) return;
  } catch (e) {
    // 集合不存在，创建它
    try {
      await db.createCollection("questions");
    } catch (_) {}
  }

  const all = [...TRUTH_QUESTIONS, ...DARE_QUESTIONS];
  for (const q of all) {
    try {
      await db.collection("questions").add({ data: q });
    } catch (_) {}
  }
  console.log("题库已自动初始化，共", all.length, "条");
};

exports.main = async (event, context) => {
  const { type = "random", roomId } = event;

  try {
    await ensureQuestions();

    let queryCond = { isActive: true };
    if (type === "truth" || type === "dare") {
      queryCond.type = type;
    } else {
      queryCond.type = Math.random() > 0.5 ? "truth" : "dare";
    }

    const countRes = await db.collection("questions").where(queryCond).count();
    if (countRes.total === 0) {
      return { success: false, errMsg: "暂无题目数据" };
    }

    const randomIndex = Math.floor(Math.random() * countRes.total);
    const questionRes = await db
      .collection("questions")
      .where(queryCond)
      .skip(randomIndex)
      .limit(1)
      .get();

    if (!questionRes.data || questionRes.data.length === 0) {
      return { success: false, errMsg: "获取题目失败，请重试" };
    }

    const question = questionRes.data[0];
    const sanitizedQuestion = {
      _id: question._id,
      content: question.content,
      type: question.type,
      difficulty: question.difficulty,
      category: question.category,
      isActive: question.isActive,
    };

    return { success: true, data: sanitizedQuestion };
  } catch (e) {
    return { success: false, errMsg: e.message || String(e) };
  }
};
