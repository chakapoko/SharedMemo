var express = require('express');
var router = express.Router();

// async
var aa = require('aa');

//mongoDB
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// Item
var DocumentSchema = new Schema({
  id: {
    type: String,
    index: true,
    unique: true,
    required: true
  },

  type : {
    type: String,
    enum: ["collection", "document", "comment"],
  },
  title: String,
  content : {
    type: String,
    required: true
  },

  parent: Schema.Types.Mixed,  //id or document
  children: {
    type: [Schema.Types.Mixed], //id or document
    default:[]
  },

  created_at: {
    type: Date,
    default: Date.now
  },
  last_modified_at: {
    type: Date,
    default: Date.now
  },
});

var CounterSchema = new Schema({
  key : String,
  count : Number
})

mongoose.model('Document', DocumentSchema);
mongoose.model('Counter', CounterSchema);
const db = mongoose.createConnection('mongodb://localhost:27017/cardbox');
const Doc = db.model('Document');
const Counter = db.model('Counter');

/**
  Access 
*/
router.all( '/*', function ( req, res, next ) {
    res.contentType( 'json' );
    res.header( 'Access-Control-Allow-Origin', '*' );
    next();
} );

// GET /api/
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});


/**
  Tool Generator for each method
*/

// replace id to object
const replaceIdToDoc = function *(doc) {
  try {
    if (doc.parent && doc.parent !== "") {
      doc.parent = yield(Doc.findOne({ id: doc.parent }));
    }
    doc.children = yield(Doc.find({ id: { $in: doc.children } }));
    return doc;
  }
  catch(err) {
    console.log("replaceIdToDoc", err);
    return err;
  }
}



/**
  Generator for each method
*/

// get all Documents
const getAllDocuments = function *() {
  try {
    var result = yield(Doc.find().exec());
    return { docs : result };
  }
  catch (err) {
    return { err : err};
  }
};

// delete all Documents
const deleteAllDocuments = function *() {
  try {
    var result = yield(Doc.find().remove().exec());
    return {result : result};
  }
  catch (err) {
    return { err : err};
  }
}

// create new document
const createDocument = function *(req) {
  try {
    // id counter
    var counter = yield(Counter.findOneAndUpdate(
      { key: "id" },
      { $inc: { count: 1 } },
      { upsert: true, returnOriginal: true }
    ));
    var id = counter.count.toString();

     // document object
    var doc = new Doc({
      id: req.body.id || id,
      parent: req.body.parent,
      title: req.body.title,
      content: req.body.content,
      type: req.body.type
    });
    yield(doc.save());
    
    // add link to parent
    if (doc.parent) {
      var parent = yield(Doc.findOne( { id: doc.parent} ).exec());
      parent.children.push( doc.id );
      yield(parent.save());
    }
    doc = yield(replaceIdToDoc(doc));

    return {doc : doc};
  }
  catch(err) {
    console.log(err);
    return {err:err};
  }
}

//get one Document
const getDocument = function *(req) {
  try {
    var doc = yield(Doc.findOne({ id: req.params.id }));
    doc = yield(replaceIdToDoc(doc));
    return {doc : doc};
  }
  catch (err) {
    return { err: err};
  }
}

//delete one Document
const deleteDocument = function *(req) {
  try {
    var target = yield(Doc.findOne({id: req.params.id}));
    
    // remove link from parent
    var parentId = target.parent;
    if (parentId) {
      var parent = yield(Doc.findOne({id: parentId}));
      parent.children = parent.children.filter(function(val){ return val != target.id;});
      yield(parent.save());
    }
    
    var result = yield(target.remove().exec());
    return {result : result};
  }
  catch (err) {
    return { err : err};
  }
}

// update one Document
const updateDocument = function *(req) {
  try {
    req.body.last_modified_at = Date.now();
    var doc = yield (Doc.findOneAndUpdate({ id: req.params.id }, req.body, {new: true}));
    doc = yield(replaceIdToDoc(doc));
    return {doc : doc};
  }
  catch (err) {
    return { err : err};
  }
}


/**
  connect generators with HTTP Request 
*/

function apiHandler(generator, endStatus = 200) {
  return function(req, res) {
    aa(generator(req)).then(function(result){
      var status = result.err ? 500 : endStatus;
      res.status(status).json(result);
    })
  };
}

router.get('/docs', apiHandler(getAllDocuments));
router.delete('/docs', apiHandler(deleteAllDocuments));
router.post('/docs', apiHandler(createDocument, 201));

router.get('/docs/:id', apiHandler(getDocument));
router.delete('/docs/:id', apiHandler(deleteDocument));
router.put('/docs/:id', apiHandler(updateDocument,201));



function *testDocument(){
  try {
/*
    var counter = yield(Counter.findOneAndUpdate(
      { key: "id" },
      { $inc: { count: 1 } },
      { upsert: true, returnOriginal: true }
    ));
    console.log(counter);
    var id = counter.count;
    //var counter = new Counter({key : "id", count:0});
    //yield(counter.save());
    return counter;
*/
}
  catch(e) {
    return e;
  }
}

aa(testDocument()).then(function(value){
 console.log("test:", value);
})

module.exports = router;
