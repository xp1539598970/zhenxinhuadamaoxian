const cloud = require("wx-server-sdk");
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

exports.main = async (event, context) => {
  const { fileList } = event;

  if (!fileList || !Array.isArray(fileList) || fileList.length === 0) {
    return {
      success: false,
      errMsg: "fileList 不能为空",
    };
  }

  try {
    const res = await cloud.getTempFileURL({
      fileList,
    });

    return {
      success: true,
      fileList: res.fileList.map((item) => ({
        fileID: item.fileID,
        tempFileURL: item.tempFileURL,
        status: item.status,
      })),
    };
  } catch (e) {
    return {
      success: false,
      errMsg: e.message || String(e),
    };
  }
};
