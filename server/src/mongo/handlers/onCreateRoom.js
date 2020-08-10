import collections from '../../../collections.json'

export default async (db, payload) => {
  const collection = db.collection(collections.users)

  await collection.updateOne({id: payload}, {$set: {room: []} }, {upsert: true})
}