module.exports = async (hap, accessory, el, address, eoj) => {
  const service = accessory.getService(hap.Service.Lightbulb) ||
                  accessory.addService(hap.Service.Lightbulb)
  const propertyValue = (await el.getPropertyValue(address, eoj, 0x80))
  console.log("Log1")
  console.log(propertyValue.message.data)
  let {status} = propertyValue.message.data
  service.updateCharacteristic(hap.Characteristic.On, status)

  const updateStatus = (s) => {
    status = s
    service.updateCharacteristic(hap.Characteristic.On, status)
  }

  service.getCharacteristic(hap.Characteristic.On)
  .on('set', (value, callback) => {
    status = value
    el.setPropertyValue(address, eoj, 0x80, {status})
    callback()
  })
  .on('get', (callback) => {
    callback(null, status)
    el.getPropertyValue(address, eoj, 0x80).then((res) => {
//        console.log("Log2")
//        console.log(res.message.data)
        if (res.message.data != null) {
            updateStatus(res.message.data.status)
        }
    })
  })

  const properties = (await el.getPropertyMaps(address, eoj)).message.data.set
  if (properties.includes(0xB0)) {
    service.getCharacteristic(hap.Characteristic.Brightness)
    .on('set', async (value, callback) => {
      try {
        await el.setPropertyValue(address, eoj, 0xB0, {level: value})
        callback()
      } catch (err) {
        callback(err)
      }
    })
    .on('get', async (callback) => {
      if (!status) {
        callback(null, 0)
        return
      }
      try {
        const res = await el.getPropertyValue(address, eoj, 0xB0)
        callback(null, res.message.data.level)
      } catch (err) {
        callback(err)
      }
    })
  }

  // Subscribe to status changes.
  el.on('notify', (res) => {
    const {seoj, prop} = res.message
    if (res.device.address !== address ||
        eoj[0] !== seoj[0] || eoj[1] !== seoj[1] || eoj[2] !== seoj[2])
      return

    for (const p of prop) {
      if (!p.edt)
        continue
      if (p.epc === 0x80)  // status
        updateStatus(p.edt.status)
      else if (p.epc === 0xB0)  // level
        service.updateCharacteristic(hap.Characteristic.Brightness, p.edt.level)
    }
  })
}
