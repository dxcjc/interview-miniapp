export default defineAppConfig({
  pages: [
    'pages/index/index',
    'pages/bank/index',
    'pages/interview/index',
    'pages/plan/index',
    'pages/mine/index',
    'pages/review/index',
    'pages/graph/index',
    'pages/jobs/index',
    'pages/wrongbook/index',
    'pages/profile/index',
    'pages/progress/index',
    'pages/settings/index',
  ],
  // 微信同声传译插件（语音识别+合成）：需先在公众平台「设置→第三方设置→插件管理」添加
  plugins: {
    WechatSI: {
      version: '0.3.5',
      provider: 'wx069ba97219f66d99',
    },
  },
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#FBF8F3',
    navigationBarTitleText: '面霸陪练',
    navigationBarTextStyle: 'black',
    backgroundColor: '#FBF8F3',
  },
  permission: {
    'scope.record': { desc: '用于语音面试，自动识别你的回答' },
  },
  tabBar: {
    color: '#B4AA9C',
    selectedColor: '#FF7A45',
    backgroundColor: '#FBF8F3',
    borderStyle: 'white',
    list: [
      {
        pagePath: 'pages/index/index',
        text: '首页',
        iconPath: 'assets/tab/home.png',
        selectedIconPath: 'assets/tab/home-active.png',
      },
      {
        pagePath: 'pages/bank/index',
        text: '题库',
        iconPath: 'assets/tab/bank.png',
        selectedIconPath: 'assets/tab/bank-active.png',
      },
      {
        pagePath: 'pages/interview/index',
        text: '面试',
        iconPath: 'assets/tab/interview.png',
        selectedIconPath: 'assets/tab/interview-active.png',
      },
      {
        pagePath: 'pages/plan/index',
        text: '计划',
        iconPath: 'assets/tab/plan.png',
        selectedIconPath: 'assets/tab/plan-active.png',
      },
      {
        pagePath: 'pages/mine/index',
        text: '我的',
        iconPath: 'assets/tab/mine.png',
        selectedIconPath: 'assets/tab/mine-active.png',
      },
    ],
  },
})
