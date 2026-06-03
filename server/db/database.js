const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/poker';

mongoose.connect(MONGODB_URI).then(() => console.log('MongoDB conectado')).catch(err => console.error('MongoDB error:', err));

// === Schemas ===

const userSchema = new mongoose.Schema({
  id:           { type: String, required: true, unique: true },
  username:     { type: String, required: true, unique: true },
  email:        { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  chips:        { type: Number, default: 0 },
  totalWins:    { type: Number, default: 0 },
  totalHands:   { type: Number, default: 0 },
  isAdmin:      { type: Boolean, default: false },
  status:       { type: String, default: 'pending', enum: ['pending','active','banned','rejected'] },
  createdAt:    { type: Number, default: () => Date.now() },
});

const tableSchema = new mongoose.Schema({
  id:          { type: String, required: true, unique: true },
  name:        { type: String, required: true },
  small_blind: { type: Number, default: 10 },
  big_blind:   { type: Number, default: 20 },
  max_players: { type: Number, default: 9 },
  min_buy_in:  { type: Number, default: 200 },
  max_buy_in:  { type: Number, default: 2000 },
  isTournament:{ type: Boolean, default: false },
  buyIn:       { type: Number, default: 0 },
  prizePool:   { type: Number, default: 0 },
  createdAt:   { type: Number, default: () => Date.now() },
});

const handSchema = new mongoose.Schema({
  id:       { type: String, required: true, unique: true },
  tableId:  String,
  winnerId: String,
  pot:      Number,
  hand:     String,
  playedAt: { type: Number, default: () => Date.now() },
});

const User  = mongoose.model('User',  userSchema);
const Table = mongoose.model('Table', tableSchema);
const Hand  = mongoose.model('Hand',  handSchema);

// Compatibilidad con la API de NeDB (find, findOne, insert, update, remove, count)
function makeDB(Model) {
  return {
    async find(query = {}, opts = {}) {
      let q = Model.find(mongoQuery(query));
      if (opts.sort) q = q.sort(opts.sort);
      if (opts.limit) q = q.limit(opts.limit);
      return q.lean();
    },
    async findOne(query = {}) {
      return Model.findOne(mongoQuery(query)).lean();
    },
    async insert(doc) {
      return Model.create(doc);
    },
    async update(query, update) {
      const op = {};
      if (update.$set)  op.$set  = update.$set;
      if (update.$inc)  op.$inc  = update.$inc;
      if (update.$push) op.$push = update.$push;
      // If no operator, treat as $set
      if (!update.$set && !update.$inc && !update.$push) op.$set = update;
      return Model.updateMany(mongoQuery(query), op);
    },
    async remove(query = {}) {
      return Model.deleteMany(mongoQuery(query));
    },
    async count(query = {}) {
      return Model.countDocuments(mongoQuery(query));
    },
    // Chainable find with sort/limit
    sort(sortObj)  { this._sort  = sortObj;  return this; },
    limit(n)       { this._limit = n;        return this; },
  };
}

// Translate simple NeDB queries to Mongoose
function mongoQuery(q) {
  return q; // Mongoose accepts the same query syntax for basic ops
}

const db = {
  users:  makeDB(User),
  tables: makeDB(Table),
  hands:  makeDB(Hand),
  User, Table, Hand,
};

module.exports = db;
