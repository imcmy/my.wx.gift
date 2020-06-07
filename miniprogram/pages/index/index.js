//index.js
const app = getApp()
var utils = require('../../utils/utils.js')
import Dialog from '../../miniprogram_npm/@vant/weapp/dialog/dialog'


Page({
  data: {
    avatarUrl: '',
    nickName: '',
    addressInfo: '',
    logged: false,
    event: {}
  },

  onLoad: async function() {
    if (!wx.cloud) {
      Dialog.alert({
        message: '请使用 2.7.1 或以上的基础库以使用云能力'
      }).then(() => {
        Dialog.close()
      });
      return
    }

    if (!app.globalData.openid) {
      var login = await wx.cloud.callFunction({
        name: 'login',
        data: {}
      })
      app.globalData.openid = login.result.openid
    }

    if (app.globalData.openid) {
      var userQuery = await wx.cloud.callFunction({
        name: 'userdbo_v2',
        data: { action: 'query' }
      })
      var userData = userQuery.result
      if (userData.length === 0) return

      var addressQuery = await wx.cloud.callFunction({
        name: 'addressdbo',
        data: { action: 'queryIndexPage' }
      })
      var addressData = addressQuery.result
      if (addressData.length == 0) {
        Dialog.alert({
          message: '您还没有设置收货地址，点击前去设置'
        }).then(() => {
          wx.navigateTo({ url: '../address/address' })
        });
      } else {
        app.globalData.userInfo = {}
        app.globalData.userInfo.avatarUrl = userData[0].avatarUrl
        app.globalData.userInfo.nickName = userData[0].nickName
        app.globalData.userInfo.fullAddr = addressData[0].fullAddr
        this.setData({
          logged: true,
          avatarUrl: userData[0].avatarUrl,
          nickName: userData[0].nickName,
          addressInfo: addressData[0].fullAddr
        })
        this.fetchEvents()
      }
    }
  },

  onShow: function (e) {
    if (app.globalData.userInfo) {
      this.setData({
        avatarUrl: app.globalData.userInfo.avatarUrl,
        nickName: app.globalData.userInfo.nickName,
        addressInfo: app.globalData.userInfo.fullAddr
      })
    }
  },

  onGetUserInfo: function(e) {
    if (e.detail.userInfo && !this.regLoading) {
      var that = this
      this.regLoading = true
      wx.getSetting({
        success: res => {
          if (res.authSetting['scope.userInfo']) {
            wx.getUserInfo({
              success: async userInfo => {
                await wx.cloud.callFunction({
                  name: 'userdbo_v2',
                  data: {
                    action: 'insert',
                    nickName: userInfo.userInfo.nickName,
                    avatarUrl: userInfo.userInfo.avatarUrl
                  },
                  success: () => {
                    this.regLoading = false
                    that.onLoad()
                  }
                })
              }
            })
          }
        }
      })
      this.regLoading = false
    }
  },

  openConfirm: function () {
    Dialog.confirm({
      message: '检测到您没打开地址权限，是否去设置打开？',
      confirmButtonOpenType: 'openSetting'
    }).catch(() => {
      Dialog.close();
    });
  },

  onTapUser: function () {
    wx.navigateTo({
      url: '../user/user',
    })
  },

  onShareAppMessage: function() {},

  fetchEvents: function() {
    this.loading = true

    return wx.cloud.callFunction({
      name: 'eventdbo',
      data: { 'action': 'list' }
    }).then(res => {
      for (var key in res.result) {
        res.result[key].forEach((item, _) => {
          if (item.status == 0) item.timeFormatted = utils.unixToFormatted(item.rollTime)
          else if (item.status == 1) item.timeFormatted = utils.unixToFormatted(item.startTime)
          else if (item.status == 2 || item.status == 3) item.timeFormatted = utils.unixToFormatted(item.endTime)
        })
      }
      this.setData({ event: res.result })
      this.loading = false
    })
  },

  onPullDownRefresh() {
    if (!this.loading) {
      this.fetchEvents().then(() => {
        wx.stopPullDownRefresh()
      })
    }
  },
})
