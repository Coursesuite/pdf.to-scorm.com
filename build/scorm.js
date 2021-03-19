// global variables for scorm and the runtime
var _sAPI=(parent&&parent!==self)?"API":"",_timeSessionStart=null,_unloaded=!1,pageNumber,numPages,watch,currentPage=0,completed=0,watchValue=0;

// scorm runtime methods / utils
function trylog(){try{console.log(arguments)}catch(e){}}
function learnerWillReturn(a){"API_1484_11"==_sAPI?a?scormSetValue("cmi.exit","suspend"):scormSetValue("cmi.exit","normal"):"API"==_sAPI&&(a?scormSetValue("cmi.core.exit","suspend"):scormSetValue("cmi.core.exit",""))}
function isFirstLaunch(){if("API_1484_11"==_sAPI)var a=scormGetValue("cmi.entry");else if("API"==_sAPI)a=scormGetValue("cmi.core.entry");else return!0;return"ab-initio"!=a?!1:!0}
function startSessionTime(){return _timeSessionStart=new Date}
function setSessionTime(a){var b=(new Date).getTime();a=Math.round((b-a)/1E3);a=formatTime(a);"API_1484_11"==_sAPI?scormSetValue("cmi.session_time",a):"API"==_sAPI&&scormSetValue("cmi.core.session_time",a)}
function getBookmark(){return"API_1484_11"==_sAPI?scormGetValue("cmi.location"):"API"==_sAPI?scormGetValue("cmi.core.lesson_location"):""}
function setBookmark(a){"API_1484_11"==_sAPI?scormSetValue("cmi.location",a+""):"API"==_sAPI&&scormSetValue("cmi.core.lesson_location",a+"");emitEvent('pageview',a);}
function getSuspendData(){return"API_1484_11"==_sAPI||"API"==_sAPI?scormGetValue("cmi.suspend_data"):""}
function setSuspendData(a){"API_1484_11"!=_sAPI&&"API"!=_sAPI||scormSetValue("cmi.suspend_data",a+"")}
function setCompletionStatus(a){if("API_1484_11"==_sAPI)scormSetValue("cmi.completion_status",a+"");else if("API"==_sAPI&&("completed"==a||"incomplete"==a||"not attempted"==a)){var b=scormGetValue("cmi.core.lesson_status");"passed"==b||"failed"==b?"incomplete"!=a&&"not attempted"!=a||scormSetValue("cmi.core.lesson_status",a+""):scormSetValue("cmi.core.lesson_status",a+"")}}
function getCompletionStatus(){if("API_1484_11"==_sAPI)return scormGetValue("cmi.completion_status");if("API"==_sAPI){var a=scormGetValue("cmi.core.lesson_status");return"passed"==a||"failed"==a?"completed":a}return"not attempted"}
function setPassFail(a){"API_1484_11"==_sAPI?scormSetValue("cmi.success_status",a+""):"API"==_sAPI&&scormSetValue("cmi.core.lesson_status",a+"")}
function setScore(a){if("API_1484_11"==_sAPI)scormSetValue("cmi.score.scaled",a+"");else if("API"==_sAPI){scormSetValue("cmi.core.score.min","0");scormSetValue("cmi.core.score.max","100");var b=100*a;100<b&&(b=100);0>a-0?scormSetValue("cmi.core.score.raw","0"):scormSetValue("cmi.core.score.raw",Math.round(b)+"")}}
function scormInitialize(){var a=getAPI();if(null==a)return"false";a="API"==_sAPI?a.LMSInitialize(""):a.Initialize("");return a}
function scormTerminate(){var a=getAPI();if(null==a)return"false";a="API"==_sAPI?a.LMSFinish(""):a.Terminate("");return a}
function scormCommit(){var a=getAPI();if(null==a)return"false";a="API"==_sAPI?a.LMSCommit(""):a.Commit("");return a}
function scormGetValue(a){var b=getAPI();if(null==b)return"";if("API"==_sAPI)var c=b.LMSGetValue(a),b=b.LMSGetLastError();else c=b.GetValue(a),b=b.GetLastError();return"0"!=b?"":c}
function scormSetValue(a,b){var c=getAPI();if(null==c)return"true";c="API"==_sAPI?c.LMSSetValue(a,b):c.SetValue(a,b);return c}
function formatTime(a){var b=Math.floor(a/3600);a-=3600*b;var c=Math.floor(a/60);a-=60*c;return"API_1484_11"==_sAPI?"PT"+b+"H"+c+"M"+a+"S":"API"==_sAPI?(10>b&&(b="0"+b),10>c&&(c="0"+c),10>a&&(a="0"+a),b+":"+c+":"+a):""}
function findAPI(a,b){var c=0;try{for(;null==a[b]&&null!=a.parent&&a.parent!=a;){c++;if(7<c){trylog("findAPI gave up",a,b);return null};a=a.parent}}catch(d){trylog("findAPI forced to stop at domain boundary",a,b);return null}return a[b]}
function getAPI(){var a=findAPI(window,"API_1484_11");null==a&&null!=window.opener&&"undefined"!=typeof window.opener&&(a=findAPI(window.opener,"API_1484_11"));null==a?(a=findAPI(window,"API"),null==a&&null!=window.opener&&"undefined"!=typeof window.opener&&(a=findAPI(window.opener,"API")),null!=a&&(_sAPI="API")):_sAPI="API_1484_11";null==a&&alert("Unable to find an API adapter");return a};

// lets go
getAPI();
scormInitialize();

// public method called by body unload event(s) ONCE
function doUnload() {
  if (!_unloaded) {
    scormCommit();
    setSessionTime(_timeSessionStart);
    scormTerminate();
    _unloaded = true;
  }
}

document.addEventListener("DOMContentLoaded", function domLoader(event) {
  numPages = document.getElementById('numPages');
  pageNumber = document.getElementById('pageNumber');
  // PDFViewerApplication.eventBus is borked and in flux; javascript can't observe or use onchange events set by code; this inelegant hack always works.
  watch = setInterval(function() {
    watchValue = ~~pageNumber.value;
    if (watchValue!==currentPage) {
      currentPage = watchValue;
      checkCourseCompletion();
    }
  },1234);
  // set up the scorm object
  startSessionTime();
  setCompletionStatus("incomplete");
  learnerWillReturn(true);
  scormCommit();
});

function checkCourseCompletion() {
  var totalPages = parseInt(numPages.textContent.replace(/[^\d]/g,''), 10)||0;
  var score = Math.round((currentPage / totalPages) * 100);
  if (!completed && totalPages > 0 && currentPage === totalPages) {
    score = 100;
    completed = true;
    learnerWillReturn(false);
    if ("API_1484_11"==_sAPI) setPassFail("passed");
    setCompletionStatus("completed");
  }
  setScore(score);
  scormCommit();
}