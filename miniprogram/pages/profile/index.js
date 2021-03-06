// pages/profile/index.js
const app = getApp();
const db = wx.cloud.database();
const userDB = db.collection('user');
const images = require('../../utils/images.js');
const univcollDB = db.collection('univ-coll');
const groupDB = db.collection('group');
Page({

  data: {
    statusBarHeight: app.globalData.statusBarHeight,
    navigatorH: app.globalData.navigatorH,
    screenWidth: app.globalData.screenWidth,
    images: images,
    identities: ['普通成员', '管理员'],
  },
 
  onLoad: function (options) {
    console.log("profile ========> options: ", options)
    let _this = this;
    var openid = app.globalData.openid;//当前在线操作的用户
    if (options.gid) {
      this.setData({view: true})
      var info = JSON.parse(options.uinfo);
      var gid = options.gid;
      groupDB.where({id: gid}).get().then(res => {
        var gAdmin = res.data[0].administrator || [];//管理员列表；
        var gCreator = res.data[0].creator;
        // 如果当前用户是该组的创建者或者是管理员，则可以修改他人的身份
        if (gCreator == openid || gAdmin.indexOf(openid) != -1) {
          _this.setData({ hasPermission: true, gCreator: gCreator})
        }
        if (gAdmin.indexOf(info._id) == -1 && info._id != gCreator) { 
          info.isAdmin = false;
          info.identity = '普通成员'
        } else { 
          info.isAdmin = true;
          info.identity = '管理员'
        }
        this.setData({ userInfo: info, gid: options.gid, gAdmin: gAdmin })
      })
    } else {
      userDB.doc(app.globalData.openid).get().then(res => {
        console.log(res.data);
        this.setData({ userInfo: res.data })
      });
      univcollDB.doc('UNIV').get().then(res => {
        console.log(res.data.name);
        _this.setData({ univs: res.data.name.concat('手动输入') })
      })
      univcollDB.doc('COLL').get().then(res => {
        console.log(res.data.name);
        _this.setData({ colls: res.data.name.concat('手动输入') })
      })
      univcollDB.doc('_CLASS').get().then(res => {
        console.log(res.data.name);
        _this.setData({ _classes: res.data.name.concat('手动输入') })
      })
    }
  },

  bindIdentityChange(e) {
    var _this = this;
    var gCreator = this.data.gCreator;
    var userInfo = this.data.userInfo;//当前查看的用户
    var openid = app.globalData.openid;//当前在线操作的用户
    //当前操作用户（不是该组的创建者）是管理员不能修改该组创建者的身份信息
    if (openid != gCreator && userInfo._id == gCreator) {
      wx.showToast({
        title: '不能修改创建者的身份！',
        icon: 'none'
      })
      return;
    }
    var gid = this.data.gid;
    var originIdentity = userInfo.identity;
    var index = e.detail.value;
    var identity = this.data.identities[index];
    if (identity != originIdentity) {
      // 由普通成员到管理员
      if (identity == '管理员') {
        wx.cloud.callFunction({
          name: 'updateDoc',
          data: {
            addGroupAdmin: true,
            uid: userInfo._id,
            gid: gid
          }
        }).then(res => {
          console.log(res); 
          userInfo.identity = identity;
          _this.setData({ userInfo: userInfo })
        })
        .catch(res => {console.log(res)})
      } else if (identity == '普通成员'){
        wx.cloud.callFunction({
          name: 'updateDoc',
          data: {
            removeGroupAdmin: true,
            uid: userInfo._id,
            gid: gid
          }
        }).then(res => { 
          console.log(res);
          userInfo.identity = identity;
          _this.setData({ userInfo: userInfo })
        })
          .catch(res => { console.log(res) })
      }
    }
  },
  deleteMember() {
    var uid = this.data.userInfo._id;
    var userInfo = this.data.userInfo;//当前查看的用户
    var gCreator = this.data.gCreator;
    var gid = this.data.gid;
    var openid = app.globalData.openid;//当前在线操作的用户
    //当前操作用户（不是该组的创建者）是管理员不能修改该组创建者的身份信息
    if (openid != gCreator && userInfo._id == gCreator) {
      wx.showToast({
        title: '不能修改创建者的身份！',
        icon: 'none'
      })
      return;
    }
    var _this = this;
    console.log("deleteMember ======> ", uid, gid)
    wx.cloud.callFunction({
      name: 'updateDoc',
      data: {
        removeGroupM: true,
        gid: gid,
        uid: uid
      }
    }).then(res => {
      console.log(res);
      _this.goBack()
    }).catch(res => {console.log(res)})
  },
  
  bindCollChange(e) {
    console.log(e);
    let userInfo = this.data.userInfo;
    let userId = app.globalData.openid;
    let index = e.detail.value;
    let coll = this.data.colls[index];
    if (coll == '手动输入') {
      this.setData({
        showMask: true,
        label: "学院"
      })
    } else {
      wx.showLoading({
        title: '加载中',
      })
      console.log(coll);
      let data = {};
      data['coll'] = coll;
      data['6ae6348e-1285-4bd9-821a-36f8be522c23'] = coll;
      console.log("confirm ---------> data: ", data)
      wx.cloud.callFunction({
        name: 'updateDoc',
        data: {
          updateUser: true,
          id: userId,
          data: data
        }
      }).then(res => {
        wx.hideLoading()
        console.log(res);
        userInfo.coll = coll;
        this.setData({ userInfo: userInfo })
      })
      .catch(res => { console.log(res) })
      this.setData({showMask: false })
    }
  },

  bindUnivChange(e) {
    console.log(e);
    let userInfo = this.data.userInfo;
    let userId = app.globalData.openid;
    let index = e.detail.value;
    let univ = this.data.univs[index];
    if (univ == '手动输入') {
      this.setData({
        showMask: true,
        label: "学校"
      })
    } else {
      wx.showLoading({
        title: '加载中',
      })
      console.log(univ);
      let data = {};
      data['univ'] = univ;
      data['da755c4e-397b-4a8e-94c1-8167a63f976c'] = univ;
      console.log("confirm ---------> data: ", data)
      wx.cloud.callFunction({
        name: 'updateDoc',
        data: {
          updateUser: true,
          id: userId,
          data: data
        }
      }).then(res => {
        wx.hideLoading()
        console.log(res);
        userInfo.univ = univ;
        this.setData({ userInfo: userInfo })
      })
        .catch(res => { console.log(res) })
      this.setData({ showMask: false })
    }
  },

  bindClassChange(e) {
    console.log(e);
    let userInfo = this.data.userInfo;
    let userId = app.globalData.openid;
    let index = e.detail.value;
    let _class = this.data._classes[index];
    if (_class == '手动输入') {
      this.setData({
        showMask: true,
        label: "班级"
      })
    } else {
      wx.showLoading({
        title: '加载中',
      })
      console.log(_class);
      let data = {};
      data['_class'] = _class;
      data['4ad9f710-59b2-4b78-ac1b-925082dbe06e'] = _class;
      console.log("confirm ---------> data: ", data)
      wx.cloud.callFunction({
        name: 'updateDoc',
        data: {
          updateUser: true,
          id: userId,
          data: data
        }
      }).then(res => {
        wx.hideLoading()
        console.log(res);
        userInfo._class = _class;
        this.setData({ userInfo: userInfo })
      })
        .catch(res => { console.log(res) })
      this.setData({ showMask: false })
    }
  },


  cancelMask() {
    this.setData({showMask: false })
  },
  showMask(e) {
    let label = e.currentTarget.dataset.label;
    this.setData({ showMask: true, label: label })
  },

  bindInput(e) {
    let label = this.data.label;
    if (label == '姓名') {
      this.setData({name: e.detail.value})
    } else if (label == '手机号码') {
      this.setData({ phone: e.detail.value })
    } else if (label == 'QQ') {
      this.setData({ QQ: e.detail.value })
    } else if (label == '学号') {
      this.setData({ stdID: e.detail.value })
    } else if (label == '学院') {
      this.setData({ coll: e.detail.value })
    } else if (label == '学校') {
      this.setData({ univ: e.detail.value })
    } else if (label == '班级') {
      this.setData({ _class: e.detail.value })
    }
  },
  confirm() {
    let label = this.data.label;
    let userId = app.globalData.openid;
    let userInfo = this.data.userInfo;
    let data = {};
    wx.showLoading({
      title: '加载中',
    })
    if (label == '姓名') {
      if (this.data.name && this.data.name.trim() != '') {
        data['name'] = this.data.name;
        data['0a7d088c-1bd6-43d6-9460-f83c6f8091cd'] = this.data.name;
        data['0a7d088c1bd643d69460f83c'] = this.data.name;
        console.log("confirm ---------> data: ", data)
        wx.cloud.callFunction({
          name: 'updateDoc',
          data: {
            updateUser: true,
            id: userId,
            data: data
          }
        }).then(res => { 
          wx.hideLoading()
          console.log(res); 
          userInfo.name = this.data.name;
          this.setData({ showMask: false, userInfo: userInfo})
        })
        .catch(res => {console.log(res)})
      } else {
        wx.showToast({
          title: '无效的信息！',
          icon: 'none'
        })
      }
    } else if (label == '手机号码') {
      if (this.data.phone && this.data.phone.trim() != '') {
        data['phone'] = this.data.phone;
        data['c8fd8c56-763b-415f-9bec-99d5f8909730'] = this.data.phone;
        console.log("confirm ---------> data: ", data)
        wx.cloud.callFunction({
          name: 'updateDoc',
          data: {
            updateUser: true,
            id: userId,
            data: data
          }
        }).then(res => {
          console.log(res);
          wx.hideLoading()

          userInfo.phone = this.data.phone;
          this.setData({ showMask: false, userInfo: userInfo })
        })
          .catch(res => { console.log(res) })
      } else {
        wx.showToast({
          title: '无效的信息！',
          icon: 'none'
        })
      }
    } else if (label == 'QQ') {
      if (this.data.QQ && this.data.QQ.trim() != '') {
        data['QQ'] = this.data.QQ;
        data['1ec2b976-f1fa-4689-afd8-f5a94e3a1934'] = this.data.QQ;
        console.log("confirm ---------> data: ", data)
        wx.cloud.callFunction({
          name: 'updateDoc',
          data: {
            updateUser: true,
            id: userId,
            data: data
          }
        }).then(res => {
          console.log(res);
          wx.hideLoading()

          userInfo.QQ = this.data.QQ;
          this.setData({ showMask: false, userInfo: userInfo })
        })
          .catch(res => { console.log(res) })
      } else {
        wx.showToast({
          title: '无效的信息！',
          icon: 'none'
        })
      }
    } else if (label == '学号') {
      if (this.data.stdID && this.data.stdID.trim() != '') {
        data['stdID'] = this.data.stdID;
        data['3218ed04-9cf5-4ce3-8511-b16f8c608897'] = this.data.stdID;
        console.log("confirm ---------> data: ", data)
        wx.cloud.callFunction({
          name: 'updateDoc',
          data: {
            updateUser: true,
            id: userId,
            data: data
          }
        }).then(res => {
          console.log(res);
          wx.hideLoading()

          userInfo.stdID = this.data.stdID;
          this.setData({ showMask: false, userInfo: userInfo })
        })
          .catch(res => { console.log(res) })
      } else {
        wx.showToast({
          title: '无效的信息！',
          icon: 'none'
        })
      }
    } else if (label == '学院') {
      if (this.data.coll && this.data.coll.trim() != 0) {
        data['coll'] = this.data.coll;
        data['6ae6348e-1285-4bd9-821a-36f8be522c23'] = this.data.coll;
        console.log("confirm ---------> data: ", data)
        wx.cloud.callFunction({
          name: 'updateDoc',
          data: {
            updateUser: true,
            id: userId,
            data: data
          }
        }).then(res => {
          console.log(res);
          wx.hideLoading()

          userInfo.coll = this.data.coll;
          this.setData({ showMask: false, userInfo: userInfo });
          wx.cloud.callFunction({
            name: 'updateDoc',
            data: {
              addColl: true,
              coll: data.coll
            }
          })
        })
          .catch(res => { console.log(res) })
      } else {
        wx.showToast({
          title: '无效的信息！',
          icon: 'none'
        })
      }
    } else if (label == '学校') {
      if (this.data.univ && this.data.univ.trim() != 0) {
        data['univ'] = this.data.univ;
        data['da755c4e-397b-4a8e-94c1-8167a63f976c'] = this.data.univ;
        console.log("confirm ---------> data: ", data)
        wx.cloud.callFunction({
          name: 'updateDoc',
          data: {
            updateUser: true,
            id: userId,
            data: data
          }
        }).then(res => {
          console.log(res);
          wx.hideLoading()

          userInfo.univ = this.data.univ;
          this.setData({ showMask: false, userInfo: userInfo })
          wx.cloud.callFunction({
            name: 'updateDoc',
            data: {
              addUniv: true,
              univ: data.univ
            }
          })
        })
          .catch(res => { console.log(res) })
      } else {
        wx.showToast({
          title: '无效的信息！',
          icon: 'none'
        })
      }
    } else if (label == '班级') {
      if (this.data._class && this.data._class.trim() != '') {
        data['_class'] = this.data._class;
        data['4ad9f710-59b2-4b78-ac1b-925082dbe06e'] = this.data._class;
        console.log("confirm ---------> data: ", data)
        wx.cloud.callFunction({
          name: 'updateDoc',
          data: {
            updateUser: true,
            id: userId,
            data: data
          }
        }).then(res => {
          console.log(res);
          wx.hideLoading()

          userInfo._class = this.data._class;
          this.setData({ showMask: false, userInfo: userInfo });
          wx.cloud.callFunction({
            name: 'updateDoc',
            data: {
              addClass: true,
              _class: data._class
            }
          })
        })
          .catch(res => { console.log(res) })
      } else {
        wx.showToast({
          title: '无效的信息！',
          icon: 'none'
        })
      }
    }
  },
  goBack() {
    if (this.data.view) {
      wx.navigateBack({delta: 1})
      return;
    }
    wx.switchTab({
      url: '../home/index',
    })
  },
  chooseLocation(e) {
    let _this = this;
    let data = {};
    let userId = app.globalData.openid;
    let userInfo = this.data.userInfo;
    console.log("chooseLocation", e);
    wx.getSetting({
      success: res => {
        if (!res.authSetting['scope.userLocation']) {
          wx.authorize({
            scope: 'scope.userLocation',
            success() {
              _this.chooseLocation();
            },
            fail: res => { console.log(res) }
          })
        } else {
          wx.chooseLocation({
            success: function (res) {
              console.log(res);
              data['currentLocation'] = res.address;
              data['6d87ffa2-68b3-484e-944f-359d26866cb1'] = res.address;
              data['33c59194-fc0b-4415-b69b-5c132c49eda7'] = res.address;
              console.log("confirm ---------> data: ", data);
              wx.showLoading({
                title: '加载中',
              })
              wx.cloud.callFunction({
                name: 'updateDoc',
                data: {
                  updateUser: true,
                  id: userId,
                  data: data
                }
              }).then(res => {
                console.log(res);
                wx.hideLoading()
                userInfo.currentLocation = data.currentLocation;
                _this.setData({ showMask: false, userInfo: userInfo })
              })
                .catch(res => { console.log(res) })
            },
            fail: res => {
              console.log(res);
              wx.showToast({
                title: '请稍后再试',
                icon: 'none'
              })
            }
          })
        }
      }
    })
  },
})