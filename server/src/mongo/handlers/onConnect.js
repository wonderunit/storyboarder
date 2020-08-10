import collections from '../../../collections.json'

export default (db, payload, props) => {
  console.log('Connected: ', payload)
  console.log(props)
  const collection = db.collection(collections.users)

  collection.updateOne({id: payload}, {$set: {room: null, joined: null, id: payload} }, {upsert: true})
}