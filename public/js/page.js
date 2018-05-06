
var app = new Vue({
  el: '#app', 
  data : {
    doc : {},
    status : {
      editor : {
        active : false,
        title : "",
        content : "",
        base : {
          title : "",
          content : "",
        }
      },
      comment : ""
    }
  },
  computed : {
    //作成の新しい順
    sortedChildren : function() {
      if (app.doc.type === "collection") {
        return app.doc.children.sort(function(a,b){
          return new Date(b.last_modified_at) - new Date(a.last_modified_at);
        });
      }
      else {
        return app.doc.children.sort(function(a,b){
          return new Date(a.last_modified_at) - new Date(b.last_modified_at);
        });
      }
    },
    isCommentPostable : function() {
      return app.status.comment.match(/\S/);
    },
    //編集ダイアログ：送信可能か？
    isDocPostable : function() {
      var base = app.status.editor.base;
      var title = app.status.editor.title;
      var content = app.status.editor.content;
      var flag =
          content.match(/\S/) &&
          (content !== base.content || title !== base.title) &&
          (base.title === "" || title !== "");
      return flag;
    },
    isNewArticle : function() {
      return (app.doc.type === "collection");
    },
  },
  mounted : function() {
    var docId = location.pathname.split("/").pop();
    if (docId === "") docId ="home";
    console.log(docId);
    loadDoc("/api/docs/"+docId);
  },
  methods : {
    getHtmlContent : function(doc) {
      var src = doc.content;
      src = src.replace(/</g, "&lt;");
      src = src.replace(/>/g, "&gt;");
      src = src.replace(/\r?\n/g, "<br/>");
      src = src.replace(/https?:\/\/[\w\/:%#\$&\?\(\)~\.=\+\-]+/g, '<a href="$&" target="_blank">$&</a>');
      return src;
    },
    addNewDoc : function() {
      app.status.editor.active = true;
    },
    editDoc : function() {
      initEditor(app.doc.title, app.doc.content);
      app.status.editor.active = true;
    },
    cancelEdit : function() {
      app.status.editor.active = false;
      initEditor();
    },
    submitComment : function() {
      var msg = {
        content: app.status.comment,
        parent: app.doc.id,
        type: "comment"
      };

      app.status.comment = "";
      axios.post("/api/docs", msg)
        .then(function(res){
          console.log("ok",res);
          loadDoc("/api/docs/" + app.doc.id);
        })
        .catch(function(err){
          console.log(err);
        });
    },
    submitDoc : function() {
      if (!app.status.editor.title.match(/\S/)) {
        var tempTitle = getTempTitle();
        var isAutoTitle = confirm("タイトルが空欄です。\n現在の日時 " + tempTitle + " にしますか？");
        if (isAutoTitle) {
          app.status.editor.title = tempTitle;
        }
        else {
          return;
        }
      }

      var msg = {
        title : app.status.editor.title,
        content :app.status.editor.content,
        type : "document"
      };

      var option = { };
      var resHandler = function(res){
        console.log("ok",res);
        location.href="/doc/" + res.data.doc.id;
      }
      var errHandler = function(err){
        console.log(err);
      }

      if (app.isNewArticle) {
        msg.parent = app.doc.id;
        axios.post("/api/docs", msg).then(resHandler).catch(errHandler);
      }
      else {
        axios.put("/api/docs/"+app.doc.id, msg).then(resHandler).catch(errHandler);
      }

      console.log(option, msg);
      app.status.editor.active = false;
      initEditor();
      app.status.comment = "";

    },
  },
  directives: {
    focus: {
      inserted: function (el) {
        el.focus()
      }
    }
  },
});

function loadDoc(path) {
  axios.get(path)
    .then(function(res) {
      var doc = res.data.doc;
      if (!res.data.doc.id) {
        doc = {
          type: "document",
          title: "ページが見つかりません",
          content: "URLを確認してください",
          fixed: true,
        }
      }
      document.title = "Shared Memo : " + doc.title;
      app.doc = doc;
    })
    .catch(function(err){
      console.log(err);
    })
}

function initEditor(title, content) {
  title = title || "";
  content = content || "";
  app.status.editor.title = title;
  app.status.editor.content = content;
  app.status.editor.base.title = title;
  app.status.editor.base.content = content;
}

function getTempTitle() {
  var d = new Date();
  var title =
      d.getFullYear() + "-" +
      ("0" + (d.getMonth() + 1)).slice(-2) + "-" +
      ("0" + (d.getDate())).slice(-2) + " " +
      ("0" + (d.getHours())).slice(-2) + ":" +
      ("0" + (d.getMinutes())).slice(-2) + ":" +
      ("0" + (d.getSeconds())).slice(-2);
  return title;
}
