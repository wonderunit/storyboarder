import collections from '../../../collections.json'

export default (db, payload) => {
  console.log('Disconnected', payload)
  const collection = db.collection(collections.users)

  collection.deleteOne({id: payload})
}