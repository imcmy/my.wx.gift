// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database().collection('event')
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

const calcEventStatus = (start, roll, end) => {
  if (start <= roll && roll <= end) {
    var current = new Date().getTime()
    if (start > current) return 1
    else if (start <= current && current <= roll) return 0
    else if (roll < current && current <= end) return 2
    else if (end < current) return 3
    else return -1
  } else {
    return -1
  }
}


// 云函数入口函数
exports.main = async (event, context) => {
  var action = event.action
  var openid = cloud.getWXContext().OPENID
  try {
    switch (action) {
      case 'insert':
        return await db.add({
          data: {
            eventName: event.eventName,
            group: event.eventGroup,
            startTime: event.startTime,
            rollTime: event.rollTime,
            endTime: event.endTime,
            description: event.description,
            rolled: false,
            ended: false,
            audited: false,
            creator: openid,
            enrollment: 0
          }
        })
      case 'update':
        return await db.doc(event._id).update({
          data: {
            eventName: event.eventName,
            startTime: event.startTime,
            rollTime: event.rollTime,
            endTime: event.endTime,
            description: event.description,
            rolled: false,
            ended: false,
            audited: false
          }
        })
      case 'query':
        var record = unPackQuery(await db.doc(event._id).get())
        record[0].status = calcEventStatus(record[0].startTime, record[0].rollTime, record[0].endTime)
        if (!record[0].ended && record[0].status == 3) {
          record[0].ended = true
          await db.doc(event._id).update({ data: { ended: true } })
        }
        return record
      case 'list':
        var groups = unPackQuery(await cloud.callFunction({
          name: 'userdbo_v2',
          data: {
            action: 'queryGroups',
            _openid: openid
          }
        }))

        var eventRecords = {
          wait: [],
          register: [],
          publish: [],
          end: []
        }

        var records = unPackQuery(await db.where({ audited: true, group: _.in(groups) }).get())
        await records.forEach((item, index, _) => {
          item.status = calcEventStatus(item.startTime, item.rollTime, item.endTime)
          switch (item.status) {
            case 0: eventRecords.register.push(item); break;
            case 1: eventRecords.wait.push(item); break;
            case 2: eventRecords.publish.push(item); break;
            case 3: eventRecords.end.push(item); break;
          }
        })

        return eventRecords
      case 'listv2':
        var groups = unPackQuery(await cloud.callFunction({
          name: 'userdbo_v2',
          data: { action: 'queryGroups', _openid: openid }
        }))

        var eventRecords = {
          notStarted: [],
          ableToApply: [],
          applied: [],
          publish: [],
          end: []
        }

        var records = unPackQuery(await db.where({ audited: true, group: _.in(groups) }).get())
        var searches = unPackQuery(await cloud.callFunction({
          name: 'gift',
          data: { action: 'searchInv2', _openid: openid }
        }))
        var participanted = searches.map((value, idx, _) => { return value._eid })
        records.forEach((item, index, _) => {
          isIn = participanted.includes(item._id)
          item.status = calcEventStatus(item.startTime, item.rollTime, item.endTime)
          switch (item.status) {
            case 0:
              isIn ? eventRecords.applied.push(item) : eventRecords.ableToApply.push(item) ; break;
            case 1: eventRecords.notStarted.push(item); break;
            case 2: isIn && eventRecords.publish.push(item); break;
            case 3: isIn && eventRecords.end.push(item); break;
          }
        })

        return eventRecords
      case 'inc':
        return await db.where({ _id: event._id }).update({ data: { enrollment: _.inc(1) } })
      case 'minc':
        return await db.where({ _id: event._id }).update({ data: { enrollment: _.inc(-1) } })
    }
  } catch (e) {
    console.log(e)
  }
}