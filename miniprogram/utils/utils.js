const cutdown = time => {
  var cutdown = new Date().getTime() - time
  return cutdown > 0 ? cutdown : 0 - cutdown
}

const formatNumber = n => {
  n = n.toString()
  return n[1] ? n : '0' + n
}

const secondsNo = timeStamp => {
  var date = new Date(timeStamp)
  date.setSeconds(0, 0)
  return date.getTime()
}

const unixToFormatted = timeStamp => {
  var date = new Date(timeStamp)
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours()
  const minute = date.getMinutes()
  const second = date.getSeconds()

  return [year, month, day].map(formatNumber).join('/') + ' ' + [hour, minute].map(formatNumber).join(':')
}

const nextOKTime = () => {
  var date = new Date()
  if (date.getMinutes() < 30) {
    date.setMinutes(30)
  } else if (date.getMinutes() > 30) {
    date.setMinutes(0)
    date.setHours(date.getHours() + 1)
  }
  return date.getTime()
}

module.exports = {
  cutdown: cutdown,
  unixToFormatted: unixToFormatted,
  secondsNo: secondsNo,
  nextOKTime: nextOKTime
}