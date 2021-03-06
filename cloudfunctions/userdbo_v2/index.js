// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database().collection('user')
const _ = cloud.database().command


const unPackQuery = obj => {
  var queried = []
  var data = obj.data ? obj.data : (obj.result ? obj.result : [])
  if (Array.isArray(data))
    data.forEach((value, index, _) => {
      queried.push(value)
    })
  else
    queried.push(data)
  return queried
}

function removeArray (arr) {
  var what, a = arguments, L = a.length, ax;
  while (L > 1 && arr.length) {
    what = a[--L];
    while ((ax = arr.indexOf(what)) !== -1) {
      arr.splice(ax, 1);
    }
  }
  return arr;
}

// 云函数入口函数
exports.main = async (event, context) => {
  var openid = cloud.getWXContext().OPENID
  
  var action = event.action
  try {
    switch (action) {
      case 'insert':
        var userCheck = await db.where({ _openid: openid }).count()
        if (userCheck.total > 0) return
        return await db.add({
          data: {
            _openid: openid,
            nickName: event.nickName,
            avatarUrl: event.avatarUrl,
            privilege: 0,
            groups: ['DEFAULTGROUPID']
          }
        })
      case 'update':
        return await db.doc(event._id).update({
          data: {
            nickName: event.nickName,
            avatarUrl: event.avatarUrl,
          }
        })
      case 'query':
        return unPackQuery(await db.where({ _openid: openid }).get())
      case 'queryGroups':
        var unPack = unPackQuery(await db.where({ _openid: event._openid }).get())
        return unPack[0].groups
      case 'checkInGroup':
        var unPack = unPackQuery(await db.where({ _openid: event._openid, groups: event._gid }).get())
        return unPack.length > 0
      case 'queryGroupsDetail':
        var unPack = unPackQuery(await db.where({ _openid: openid }).get())
        return unPackQuery(await cloud.callFunction({
          name: 'groupdbo',
          data: {
            action: 'queryList',
            list: unPack[0].groups
          }
        }))
      case 'joinGroup':
        var user = unPackQuery(await db.where({ _openid: openid }).get())
        var groups = user[0].groups
        var unPack = unPackQuery(await cloud.callFunction({
          name: 'groupdbo',
          data: {
            action: 'queryKey',
            key: event.key
          }
        }))
        if (unPack.length == 0)
          return -1
        if (groups.indexOf(unPack[0]._id) == -1) {
          groups.push(unPack[0]._id)
          await db.where({ _openid: openid }).update({ data: { groups: groups } })
          return 0
        }
        return 1
      case 'queryList':
        var list = []
        for (var key in event.list) {
          var user = unPackQuery(await db.where({ _openid: event.list[key] }).get())
          var addr = unPackQuery(await cloud.callFunction({
            name: 'addressdbo',
            data: {
              action: 'queryCurrent',
              _openid: event.list[key]
            }
          }))
          list.push(user[0].nickName + ' (' + addr[0].recipient + ')')
        }
        return list
    }
  } catch (e) {
    console.log(e)
  }
}