
$(document).ready(function () {

    $('#quick-carousel').owlCarousel({
        loop: true,
        margin: 10,
        nav: false,
        dots: false,
        autoplay: true,
        autoplayTimeout: 5000,
        autoplayHoverPause: false,
        responsive: {
            0: {
                items: 1
            },
            500: {
                items: 2
            },
            768: {
                items: 2
            },
            992: {
                items: 3
            },
            1330: {
                items: 5
            }
        }
    })

    GetStudentCoursesList();
    GetFeeDetails();
    GetStudentMyMessages();
    GetStudentPendingAssignments();
    getMyHeads();
    StudentInfo();
    GetPlacementDrives();
    getWhatsappno();


    $.ajax({
        type: "POST",
        contentType: "application/json; charset=utf-8",
        url: "StudentDashboard.aspx/GetHappeningPosts",
        data: JSON.stringify({}),
        dataType: "json",
        success: function (data) {
            data = data.d;

            $("#HappeningData").html((data));
            $('#demo').marquee({

                // enable the plugin
                enable: true,  //plug-in is enabled

                // scroll direction
                // 'vertical' or 'horizontal'
                direction: 'vertical',

                // children items
                itemSelecter: 'li',

                // animation delay
                delay: 3000,

                // animation speed
                speed: 1,

                // animation timing
                timing: 1,

                // mouse hover to stop the scroller
                mouse: true

            });

        },
        error: function (result) {
        }
    });




    $.ajax({
        type: "POST",
        contentType: "application/json; charset=utf-8",
        url: "StudentDashboard.aspx/GetPromotionPosts",
        data: JSON.stringify({}),
        dataType: "json",
        success: function (data) {
            data = data.d;

            $("#DT").html(decodeURI(data));
            var owl = $('#Happeningpostss').owlCarousel({
                items: 1,
                loop: true,
                autoplay: 5000,
                autoplaySpeed: 800,
                autoplayHoverPause: true,
                mouseDrag: true,
                touchDrag: true,
                video: true,
                nav: false,
                pagination: false,
                dots: true
            });

            owl.trigger('refresh.owl.carousel');
        },
        error: function (result) {
            ///  swal("Ooops!", "Error Occured. Kindly try again Later!", "error");
        }
    });






});


//});



function fun_Payment(elem) {

    var dob = $(elem).data('dob');
    var fee = $(elem).data('fee');

    if (fee > "0.00") {

        $.ajax({
            type: "POST",
            contentType: "application/json; charset=utf-8",
            url: "StudentDashboard.aspx/Login",
            data: JSON.stringify({ dateofbirth: dob }),
            dataType: "json",
            success: function (response) {
                $.each((response), function (i, vals) {
                    $.each((vals), function (j, result) {
                        window.open('https://www.lpu.in/frmLoginAccounts.aspx?RID=' + result.LoginId + '&DOB=' + result.dateofbirth + '', '_blank');
                    });
                });
            },
            error: function (ts) {
                //console.log("Some error occured in fee payment url");
            }
        });
    }
    else { alert('No pending fee'); return false; }
}
function getPaymentTransactions() {
    $("#mdcontent").html("");
    $.ajax({
        type: "POST",
        contentType: "application/json; charset=utf-8",
        url: "StudentDashboard.aspx/GetPaymentDetails",
        data: JSON.stringify({}),
        dataType: "json",
        success: function (data) {
            data = data.d;
            $("#mdcontent").html(data);
        },
        error: function (result) {
            ///  swal("Ooops!", "Error Occured. Kindly try again Later!", "error");
            //$.unblockUI();
        }
    });
    //BlockUiF();
}
function GetTimetable() {
    $("#TodayTimetable").html("");
    $.ajax({
        type: "POST",
        contentType: "application/json; charset=utf-8",
        url: "StudentDashboard.aspx/GetTimetableDetails",
        data: JSON.stringify({}),
        dataType: "json",
        success: function (data) {
            data = data.d;
            $("#TodayTimetable").html(data);
        },
        error: function (result) {
            ///swal("Ooops!", "Error Occured. Kindly try again Later!", "error");
            // $.unblockUI();
        }
    });
    //BlockUiF();
}

function GetStudentCoursesList() {

    $("#CoursesList").html("");
    $.ajax({
        type: "POST",
        contentType: "application/json; charset=utf-8",
        url: "StudentDashboard.aspx/GetStudentCourses",
        data: JSON.stringify({}),
        dataType: "json",
        success: function (data) {
            data = data.d;
            $("#CoursesList").html(data);

        },
        error: function (result) {
            ///swal("Ooops!", "Error Occured. Kindly try again Later!", "error");
            //$.unblockUI();
        }
    });
    //BlockUiF();






}

function GetStudentMyMessages() {
    $("#MyMessage").html("");
    $.ajax({
        type: "POST",
        contentType: "application/json; charset=utf-8",
        url: "StudentDashboard.aspx/GetStudentMessages",
        data: JSON.stringify({}),
        dataType: "json",
        success: function (data) {
            data = data.d;
            $("#MyMessage").html(data);
        },
        error: function (result) {
            ///swal("Ooops!", "Error Occured. Kindly try again Later!", "error");
            //$.unblockUI();
        }
    });
    //BlockUiF();
}

function GetPlacementDrives() {
    $("#todayDrives").html("");
    $.ajax({
        type: "POST",
        contentType: "application/json; charset=utf-8",
        url: "StudentDashboard.aspx/GetPlacementDrives",
        data: JSON.stringify({}),
        dataType: "json",
        success: function (data) {
            data = data.d;
            $("#todayDrives").html(data);
        },
        error: function (result) {
            ///swal("Ooops!", "Error Occured. Kindly try again Later!", "error");
            //$.unblockUI();
        }
    });
    //BlockUiF();
}

function GetStudentPendingAssignments() {
    $("#PendingAssignments").html("");
    $.ajax({
        type: "POST",
        contentType: "application/json; charset=utf-8",
        url: "StudentDashboard.aspx/GetStudenPendingAssignments",
        data: JSON.stringify({}),
        dataType: "json",
        success: function (data) {
            data = data.d;
            $("#PendingAssignments").html(data);
        },
        error: function (result) {
            ///swal("Ooops!", "Error Occured. Kindly try again Later!", "error");
            //$.unblockUI();
        }
    });
    //BlockUiF();
}

function GetFeeDetails() {
    $("#feebalance").html("");
    $.ajax({
        type: "POST",
        contentType: "application/json; charset=utf-8",
        url: "StudentDashboard.aspx/PendingFee",
        data: JSON.stringify({}),
        dataType: "json",
        success: function (data) {
            data = data.d;
            $("#feebalance").html(data);
        },
        error: function (result) {
            //// swal("Ooops!", "Error Occured. Kindly try again Later!", "error");
            //$.unblockUI();
        }
    });
    //BlockUiF();
}

function getMyHeads() {
    $("#heads").html("");
    $.ajax({
        type: "POST",
        contentType: "application/json; charset=utf-8",
        url: "StudentDashboard.aspx/GetHeads",
        data: JSON.stringify({}),
        dataType: "json",
        success: function (data) {
            data = data.d;
            $("#heads").html(data);
            var owl2 = $('#heads').owlCarousel({

                loop: true,
                margin: 5,
                dots: false,
                nav: true,
                navText: ["<i class='iconsminds-arrow-back-3'></i>", "<i class='iconsminds-arrow-forward-2'></i>"],
                responsive: {
                    0: {
                        items: 1
                    },
                    575: {
                        items: 2
                    },
                    992: {
                        items: 3
                    },
                    1300: {
                        items: 4
                    }
                }

            });

            owl2.trigger('refresh.owl.carousel');
        },
        error: function (result) {
            /// swal("Ooops!", "Error Occured. Kindly try again Later!", "error");
            //$.unblockUI();
        }
    });
    //BlockUiF();



}

function BlockUiF() {
    $.blockUI({
        css: {
            border: 'none',
            padding: '10px',
            backgroundColor: '#000',
            '-webkit-border-radius': '10px',
            '-moz-border-radius': '10px',
            opacity: .5,
            color: '#fff',
            'z-index': '99999'
        },
        message: '<img src="imgs/AjaxLoading.gif" height="40px" width:"40px"/><br/> Just a moment... '
    });


    $(document).ajaxStart($.blockUI).ajaxStop($.unblockUI);
}

function getMyAllMessages() {
    $("#mymessageall").html("");
    $.ajax({
        type: "POST",
        contentType: "application/json; charset=utf-8",
        url: "StudentDashboard.aspx/ViewAllMessages",
        data: JSON.stringify({}),
        dataType: "json",
        success: function (data) {
            data = data.d;
            $("#mymessageall").html(data);
        },
        error: function (result) {
            //// swal("Ooops!", "Error Occured. Kindly try again Later!", "error");
            //$.unblockUI();
        }
    });
    //BlockUiF();
}

var AnnouncementCategory = null;
//Get Announcement Category
$.ajax({
    type: "POST",
    contentType: "application/json; charset=utf-8",
    dataType: "json",
    data: "{'LoginId':'Reg','Type':'S'}",
    url: "StudentDashboard.aspx/AnnouncementCategory",
    success: function (result) {
        var data = null;
        if (result.d == null)
            data = result;
        else
            data = result.d;

        var h = '';
        for (i = 0; i < data.length; i++) {
            if (data[i].total > 0) {
                h += '<li class="nav-item">';
                h += '<a class="nav-link ' + ((i == 0) ? "active" : "") + '" id="l' + data[i].code + '" data-toggle="tab" href="#t' + data[i].code + '" role="tab" aria-controls="t' + data[i].code + '" aria-selected="' + ((i == 0) ? "true" : "false") + '">' + data[i].name + ' (' + data[i].total + ')' + '</a>';
                h += '</li>';
            }
        }
        $("#tablist").html(h);

        AnnouncementCategory = data;
        loadAnnouncement();
    },
    complete: function () {
    },

    error: function () {
        //console.log("error in happening load");
    },

});


function loadAnnouncement() {

    $.ajax({
        type: "POST",
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        data: "{'LoginId':'Reg','Type':'S'}",
        url: "StudentDashboard.aspx/AnnouncementDetails",
        success: function (data) {
            resolve(data);
            resolvepanel(data);
        },
        error: function (error) {
            reject(error);
        }
    });

}

function resolvepanel(dat) {
    var data = null;

    if (dat.d != null)
        data = dat.d;
    else
        data = dat;

    //alert(data);
    if (data != null) {
        var hAC = '', hAM = '', hCU = '', hPL = '', hRE = '', hHR = '', hEX = '', h = '', Hstu = '';
        var cAC = 0, cAM = 0, cCU = 0, cPL = 0, cRE = 0, cHR = 0, cEX = 0, ch = 0, cstu = 0;

        var isACHeader = false, isAMHeader = false, isCUHeader = false, isPLHeader = false, isREHeader = false, isHRHeader = false, isEXHeader = false, isHstuHeader = false;

        for (i = 0; i < data.length; i++) {
            var ActDetail = data[i];
            if (AnnouncementCategory != null) {
                for (j = 0; j < AnnouncementCategory.length; j++) {
                    var category = AnnouncementCategory[j];
                    if (category.code == ActDetail.categorycode) {
                        //Card Body
                        if (category.code == "AC") {

                            if (!isACHeader) {
                                //Card Header
                                hAC = '<div class="tab-pane show active" id="t' + ActDetail.categorycode + '" role="tabpanel" aria-labelledby="l' + ActDetail.categorycode + '">';
                                isACHeader = true;
                            }

                            //Card Body
                            hAC += '<div class="row">';
                            hAC += '<div class="col-md-12 col-lg-12 col-xl-12 col-left">';

                            //hAC += '<span class="label label-sm label-info">' + category.name + '</span>';
                            //hAC += '<hr/><span class="label label-sm label-info"></span>';
                            if (ActDetail.status == "1") {
                                hAC += '<span class="announcement-subject"> <span style="color: red;" class="font-xs new-announcement">New &nbsp;</span>' + ActDetail.subject + '</span>';
                            }
                            else {
                                hAC += '<span class="announcement-subject"><h4>' + ActDetail.subject + '<h4/></span>';
                            }
                            hAC += '<span class="announcement-date"> &nbsp;' + ActDetail.HeaderDate + '</span>';

                            hAC += '<div class="panel-body table-responsive">';
                            //hAC += '<p class="text-right text-muted m0">';
                            //hAC += ActDetail.date + ' at ' + ActDetail.time;
                            //hAC += '</p>';

                            hAC += '<div>' + ActDetail.announcement + '</div>';



                            if (ActDetail.Files.length > 0) {
                                hAC += '<br><span><b>Attachments:</b></span><br>';
                                for (k = 0; k < ActDetail.Files.length; k++) {
                                    var attach = ActDetail.Files[k];
                                    hAC += '<span>' + parseInt(k + 1) + '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;   </span>';
                                    hAC += '<a href="https://ums.lpu.in/lpuums' + (attach.filepath) + '" target="_blank" style="font-weight:bold;">' + attach.FileName + '</a><br>';
                                }
                            }

                            hAC += '<br /><span><b>Uploaded By:</b></span><br />';
                            hAC += '<span>' + ActDetail.employeename + '</span><br />';
                            hAC += '<span>' + ActDetail.uploadedby + '</span><br />';
                            hAC += '<span style="font-size:smaller">*This is computer generated notice, not requiring signature</span>';

                            hAC += '</div>';

                            hAC += '</div>';
                            hAC += '</div><hr/>';
                            //End of Card Body

                            cAC++;

                        }
                        else if (category.code == "AM") {

                            if (!isAMHeader) {
                                //Card Header
                                hAM = '<div class="tab-pane show" id="t' + ActDetail.categorycode + '" role="tabpanel" aria-labelledby="l' + ActDetail.categorycode + '">';

                                isAMHeader = true;
                            }

                            //Card Body
                            hAM += '<div class="row">';
                            hAM += '<div class="col-md-12 col-lg-12 col-xl-12 col-left">';

                            // hAM += '<span class="label label-sm label-info">' + category.name + '</span>';
                            if (ActDetail.status == "1") {
                                hAM += '<span class="announcement-subject"> <span style="color: red;" class="font-xs new-announcement">New &nbsp;</span>' + ActDetail.subject + '</span>';
                            }
                            else {
                                hAM += '<span class="announcement-subject">' + ActDetail.subject + '</span>';
                            }
                            hAM += '<span class="announcement-date">&nbsp;' + ActDetail.HeaderDate + '</span>';

                            hAM += '<div class="panel-body table-responsive">';
                            //hAM += '<p class="text-right text-muted m0">';
                            //hAM += ActDetail.date + ' at ' + ActDetail.time;
                            //hAM += '</p>';

                            hAM += '<div>' + ActDetail.announcement + '</div>';

                            if (ActDetail.Files.length > 0) {
                                hAM += '<br><span><b>Attachments:</b></span><br>';
                                for (k = 0; k < ActDetail.Files.length; k++) {
                                    var attach = ActDetail.Files[k];
                                    //hAM += '<span>' + k + '</span>';
                                    //hAM += '<a href="https://ums.lpu.in/lpuums' + (attach.filepath) + ' target="_blank">' + attach.FileName + '</a><br>';
                                    hAM += '<span>' + parseInt(k + 1) + '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;   </span>';
                                    hAM += '<a href="https://ums.lpu.in/lpuums' + (attach.filepath) + '" target="_blank" style="font-weight:bold;">' + attach.FileName + '</a><br>';
                                }
                            }

                            hAM += '<br /><span><b>Uploaded By:</b></span><br />';
                            hAM += '<span>' + ActDetail.employeename + '</span><br />';
                            hAM += '<span>' + ActDetail.uploadedby + '</span><br />';
                            hAM += '<span style="font-size:smaller">*This is computer generated notice, not requiring signature</span>';

                            hAM += '</div>';

                            hAM += '</div>';
                            hAM += '</div><hr/>';
                            //End of Card Body

                            cAM++;
                        }
                        else if (category.code == "CS") {


                            if (!isCUHeader) {
                                //Card Header
                                hCU = '<div class="tab-pane show" id="t' + ActDetail.categorycode + '" role="tabpanel" aria-labelledby="l' + ActDetail.categorycode + '">';

                                isCUHeader = true;
                            }

                            //Card Body
                            hCU += '<div class="row">';
                            hCU += '<div class="col-md-12 col-lg-12 col-xl-12 col-left">';

                            //hCU += '<span class="label label-sm label-info">' + category.name + '</span>';
                            if (ActDetail.status == "1") {
                                hCU += '<span class="announcement-subject"> <span style="color: red;" class="font-xs new-announcement">New &nbsp;</span>' + ActDetail.subject + '</span>';
                            }
                            else {
                                hCU += '<span class="announcement-subject">' + ActDetail.subject + '</span>';
                            }
                            hCU += '<span class="announcement-date">&nbsp;' + ActDetail.HeaderDate + '</span>';

                            hCU += '<div class="panel-body table-responsive">';
                            //hCU += '<p class="text-right text-muted m0">';
                            //hCU += ActDetail.date + ' at ' + ActDetail.time;
                            //hCU += '</p>';

                            hCU += '<div>' + ActDetail.announcement + '</div>';

                            if (ActDetail.Files.length > 0) {
                                hCU += '<br><span><b>Attachments:</b></span><br>';
                                for (k = 0; k < ActDetail.Files.length; k++) {
                                    var attach = ActDetail.Files[k];
                                    //hCU += '<span>' + k + '</span>';
                                    //hCU += '<a href="https://ums.lpu.in/lpuums' + (attach.filepath) + ' target="_blank">' + attach.FileName + '</a><br>';

                                    hCU += '<span>' + parseInt(k + 1) + '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;   </span>';
                                    hCU += '<a href="https://ums.lpu.in/lpuums' + (attach.filepath) + '" target="_blank" style="font-weight:bold;">' + attach.FileName + '</a><br>';
                                }
                            }

                            hCU += '<br /><span><b>Uploaded By:</b></span><br />';
                            hCU += '<span>' + ActDetail.employeename + '</span><br />';
                            hCU += '<span>' + ActDetail.uploadedby + '</span><br />';
                            hCU += '<span style="font-size:smaller">*This is computer generated notice, not requiring signature</span>';

                            hCU += '</div>';

                            hCU += '</div>';
                            hCU += '</div><hr/>';
                            //End of Card Body

                            cCU++;

                        }
                        else if (category.code == "PL") {


                            if (!isPLHeader) {
                                //Card Header
                                hPL = '<div class="tab-pane show" id="t' + ActDetail.categorycode + '" role="tabpanel" aria-labelledby="l' + ActDetail.categorycode + '">';

                                isPLHeader = true;
                            }

                            //Card Body
                            hPL += '<div class="row">';
                            hPL += '<div class="col-md-12 col-lg-12 col-xl-12 col-left">';

                            //hPL += '<span class="label label-sm label-info">' + category.name + '</span>';
                            if (ActDetail.status == "1") {
                                hPL += '<span class="announcement-subject"> <span style="color: red;" class="font-xs new-announcement">New &nbsp;</span>' + ActDetail.subject + '</span>';
                            }
                            else {
                                hPL += '<span class="announcement-subject">' + ActDetail.subject + '</span>';
                            }
                            hPL += '<span class="announcement-date">&nbsp;' + ActDetail.HeaderDate + '</span>';

                            hPL += '<div class="panel-body table-responsive">';
                            //hPL += '<p class="text-right text-muted m0">';
                            //hPL += ActDetail.date + ' at ' + ActDetail.time;
                            //hPL += '</p>';

                            hPL += '<div>' + ActDetail.announcement + '</div>';

                            if (ActDetail.Files.length > 0) {
                                hPL += '<br><span><b>Attachments:</b></span><br>';
                                for (k = 0; k < ActDetail.Files.length; k++) {
                                    var attach = ActDetail.Files[k];
                                    //hPL += '<span>' + k + '</span>';
                                    //hPL += '<a href="https://ums.lpu.in/lpuums' + (attach.filepath) + ' target="_blank">' + attach.FileName + '</a><br>';


                                    hPL += '<span>' + parseInt(k + 1) + '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;   </span>';
                                    hPL += '<a href="https://ums.lpu.in/lpuums' + (attach.filepath) + '" target="_blank" style="font-weight:bold;">' + attach.FileName + '</a><br>';
                                }
                            }

                            hPL += '<br /><span><b>Uploaded By:</b></span><br />';
                            hPL += '<span>' + ActDetail.employeename + '</span><br />';
                            hPL += '<span>' + ActDetail.uploadedby + '</span><br />';
                            hPL += '<span style="font-size:smaller">*This is computer generated notice, not requiring signature</span>';

                            hPL += '</div>';

                            hPL += '</div>';
                            hPL += '</div><hr/>';
                            //End of Card Body

                            cPL++;
                        }
                        else if (category.code == "RE") {



                            if (!isREHeader) {
                                //Card Header
                                hRE = '<div class="tab-pane show" id="t' + ActDetail.categorycode + '" role="tabpanel" aria-labelledby="l' + ActDetail.categorycode + '">';


                                isREHeader = true;



                            }


                            //Card Body
                            hRE += '<div class="row">';
                            hRE += '<div class="col-md-12 col-lg-12 col-xl-12 col-left">';

                            //hRE += '<span class="label label-sm label-info">' + category.name + '</span>';
                            if (ActDetail.status == "1") {
                                hRE += '<span class="announcement-subject"> <span style="color: red;" class="font-xs new-announcement">New &nbsp;</span>' + ActDetail.subject + '</span>';
                            }
                            else {
                                hRE += '<span class="announcement-subject">' + ActDetail.subject + '</span>';
                            }
                            hRE += '<span class="announcement-date">&nbsp;' + ActDetail.HeaderDate + '</span>';

                            hRE += '<div class="panel-body table-responsive">';
                            //hRE += '<p class="text-right text-muted m0">';
                            //hRE += ActDetail.date + ' at ' + ActDetail.time;
                            //hRE += '</p>';

                            hRE += '<div>' + ActDetail.announcement + '</div>';

                            if (ActDetail.Files.length > 0) {
                                hRE += '<br><span><b>Attachments:</b></span><br>';
                                for (k = 0; k < ActDetail.Files.length; k++) {
                                    var attach = ActDetail.Files[k];
                                    //hRE += '<span>' + k + '</span>';
                                    //hRE += '<a href="https://ums.lpu.in/lpuums' + (attach.filepath) + ' target="_blank">' + attach.FileName + '</a><br>';

                                    hRE += '<span>' + parseInt(k + 1) + '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;   </span>';
                                    hRE += '<a href="https://ums.lpu.in/lpuums' + (attach.filepath) + '" target="_blank" style="font-weight:bold;">' + attach.FileName + '</a><br>';
                                }
                            }

                            hRE += '<br/><span><b>Uploaded By:</b></span><br />';
                            hRE += '<span>' + ActDetail.employeename + '</span><br />';
                            hRE += '<span>' + ActDetail.uploadedby + '</span><br />';
                            hRE += '<span style="font-size:smaller">*This is computer generated notice, not requiring signature</span>';

                            hRE += '</div>';

                            hRE += '</div>';
                            hRE += '</div><hr/>';
                            //End of Card Body

                            cRE++;

                        }
                        else if (category.code == "HR") {

                            if (!isHRHeader) {
                                //Card Header
                                hHR = '<div class="tab-pane show" id="t' + ActDetail.categorycode + '" role="tabpanel" aria-labelledby="l' + ActDetail.categorycode + '">';

                                isHRHeader = true;

                            }

                            //Card Body
                            hHR += '<div class="row">';
                            hHR += '<div class="col-12 col-lg-12 col-xl-12 col-left">';

                            //hHR += '<span class="label label-sm label-info">' + category.name + '</span>';
                            if (ActDetail.status == "1") {
                                hHR += '<span class="announcement-subject"> <span style="color: red;" class="font-xs new-announcement">New &nbsp;</span>' + ActDetail.subject + '</span>';
                            }
                            else {
                                hHR += '<span class="announcement-subject">' + ActDetail.subject + '</span>';
                            }
                            hHR += '<span class="announcement-date">&nbsp;' + ActDetail.HeaderDate + '</span>';

                            hHR += '<div class="panel-body table-responsive">';
                            //hHR += '<p class="text-right text-muted m0">';
                            //hHR += ActDetail.date + ' at ' + ActDetail.time;
                            //hHR += '</p>';

                            hHR += '<div>' + ActDetail.announcement + '</div>';


                            if (ActDetail.Files.length > 0) {


                                hHR += '<br><span><b>Attachments:</b></span><br>';
                                for (k = 0; k < ActDetail.Files.length; k++) {
                                    var attach = ActDetail.Files[k];
                                    hHR += '<span>' + parseInt(k + 1) + '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;   </span>';
                                    hHR += '<a href="https://ums.lpu.in/lpuums' + (attach.filepath) + '" target="_blank" style="font-weight:bold;">' + attach.FileName + '</a><br>';

                                }
                            }

                            hHR += '<br /><span><b>Uploaded By:</b></span><br />';
                            hHR += '<span>' + ActDetail.employeename + '</span><br />';
                            hHR += '<span>' + ActDetail.uploadedby + '</span><br />';
                            hHR += '<span style="font-size:smaller">*This is computer generated notice, not requiring signature</span>';

                            hHR += '</div>';

                            hHR += '</div>';
                            hHR += '</div><hr/>';
                            //End of Card Body

                            cHR++;

                        }



                        else if (category.code == "EX") {

                            if (!isEXHeader) {
                                //Card Header
                                hEX = '<div class="tab-pane show" id="t' + ActDetail.categorycode + '" role="tabpanel" aria-labelledby="l' + ActDetail.categorycode + '">';

                                isEXHeader = true;
                            }

                            //Card Body
                            hEX += '<div class="row">';
                            hEX += '<div class="col-md-12 col-lg-12 col-xl-12 col-left">';

                            //hEX += '<span class="label label-sm label-info">' + category.name + '</span>';
                            if (ActDetail.status == "1") {
                                hEX += '<span class="announcement-subject"> <span style="color: red;" class="font-xs new-announcement">New &nbsp;</span>' + ActDetail.subject + '</span>';
                            }
                            else {
                                hEX += '<span class="announcement-subject">' + ActDetail.subject + '</span>';
                            }
                            hEX += '<span class="announcement-date">&nbsp;' + ActDetail.HeaderDate + '</span>';

                            hEX += '<div class="panel-body table-responsive">';
                            //hEX += '<p class="text-right text-muted m0">';
                            //hEX += ActDetail.date + ' at ' + ActDetail.time;
                            //hEX += '</p>';

                            hEX += '<div>' + ActDetail.announcement + '</div>';

                            if (ActDetail.Files.length > 0) {
                                hEX += '<br><span><b>Attachments:</b></span><br>';
                                for (k = 0; k < ActDetail.Files.length; k++) {
                                    var attach = ActDetail.Files[k];
                                    //hEX += '<span>' + k + '</span>';
                                    //hEX += '<a href="https://ums.lpu.in/lpuums' + (attach.filepath) + ' target="_blank">' + attach.FileName + '</a><br>';

                                    hEX += '<span>' + parseInt(k + 1) + '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;   </span>';
                                    hEX += '<a href="https://ums.lpu.in/lpuums' + (attach.filepath) + '" target="_blank" style="font-weight:bold;">' + attach.FileName + '</a><br>';
                                }
                            }

                            hEX += '<br/><span><b>Uploaded By:</b></span><br/>';
                            hEX += '<span>' + ActDetail.employeename + '</span><br />';
                            hEX += '<span>' + ActDetail.uploadedby + '</span><br />';
                            hEX += '<span style="font-size:smaller">*This is computer generated notice, not requiring signature</span>';

                            hEX += '</div>';

                            hEX += '</div>';
                            hEX += '</div><hr/>';
                            //End of Card Body

                            cEX++;
                        }



                    }
                }
            }
        }


        if (hAC != '') {
            //hAC Card Header closed
            hAC += '</div>';

        }

        if (hAM != '') {
            //hAC Card Header closed
            hAM += '</div>';
        }

        if (hCU != '') {
            //hCU Card Header closed
            hCU += '</div>';
        }

        if (hPL != '') {
            //hCU Card Header closed
            hPL += '</div>';
        }

        if (hRE != '') {
            //hRE Card Header closed
            hRE += '</div>';
            //console.log(hRE);
        }

        if (hHR != '') {
            //hHR Card Header closed

        }

        if (hEX != '') {
            //hEX Card Header closed
            hEX += '</div>';
        }

        if (Hstu != '') {
            //hEX Card Header closed
            Hstu += '</div>';
        }

        $("#tabcontent").html(hAC);
        $("#tabcontent").append(hAM);
        $("#tabcontent").append(hCU);
        $("#tabcontent").append(hHR);
        $("#tabcontent").append(hEX);
        $("#tabcontent").append(hPL);
        $("#tabcontent").append(hRE);
        $("#tabcontent").append(Hstu);



        $("#cAC").html(cAC);
        $("#cAM").html(cAM);
        $("#cCU").html(cCU);
        $("#cHR").html(cHR);
        $("#cEX").html(cEX);
        $("#cPL").html(cPL);
        $("#cRE").html(cRE);


        $("#cstu").html(cstu);

        /// console.log(cRE);

        /*$("#button").click(function () {
            var current_index = $("#tabs").tabs("option", "selected");
            $("#tabs").tabs('load', current_index);
        });*/

        //$("#tablist").tabs('load', 0);

        /*$("#tablist > li").click(function(evt){
            var li = $(this).children(0).attr('aria-controls');
            //alert(li);
            $('#tabcontent > div.tab-pane').each(function(i,e){
                $(e).removeClass('active');
            });
            alert($("#t" + li).attr('id'));
            $("#t" + li).addClass('active');
        });*/

    }
}

function resolve(dat) {
    var data = null;

    if (dat.d != null)
        data = dat.d;
    else
        data = dat;

    //alert(data);
    if (data != null) {


        var hAC = '', hAM = '', hCU = '', hPL = '', hRE = '', hHR = '', hEX = '', h = '', Hstu = '';
        var cAC = 0, cAM = 0, cCU = 0, cPL = 0, cRE = 0, cHR = 0, cEX = 0, ch = 0; cstu = 0;

        var isACHeader = false, isAMHeader = false, isCUHeader = false, isPLHeader = false, isREHeader = false, isHRHeader = false, isEXHeader = false, isHstuHeader = false;

        for (i = 0; i < data.length; i++) {
            var ActDetail = data[i];
            if (AnnouncementCategory != null) {
                for (j = 0; j < AnnouncementCategory.length; j++) {
                    var category = AnnouncementCategory[j];
                    if (category.code == ActDetail.categorycode) {
                        //Card Body
                        if (category.code == "AC") {

                            if (!isACHeader) {
                                //Card Header
                                hAC += '<div class="card">';
                                hAC += '<div class="card-header" id="' + ActDetail.categorycode + '">';
                                hAC += '<h2 class="mb-0">';
                                hAC += '<button class="btn btn-link" type="button" data-toggle="collapse" data-target="#collapse' + ActDetail.categorycode + '"" aria-expanded="false" aria-controls="collapse' + ActDetail.categorycode + '"">';
                                hAC += category.name + ' (<span id="c' + ActDetail.categorycode + '"></span>)';
                                hAC += '</button>';
                                hAC += '</h2>';
                                hAC += '</div>';

                                isACHeader = true;
                            }

                            //Card Body
                            hAC += '<div id="collapse' + ActDetail.categorycode + '" class="collapse" aria-labelledby="' + ActDetail.categorycode + '" data-parent="#AnnouncementPanel">';
                            hAC += '<div class="card-body">'
                            hAC += '<span class="label label-sm label-danger">' + category.name + '</span>';
                            if (ActDetail.status == "1") {
                                hAC += '<span class="announcement-subject"> <span style="color: red;" class="font-xs new-announcement">New</span>' + ActDetail.subject + '</span>';
                            }
                            else {
                                hAC += '<span class="announcement-subject">' + ActDetail.subject + '</span>';
                            }
                            hAC += '<span class="announcement-date">' + ActDetail.HeaderDate + '</span>';

                            hAC += '<div class="panel-body table-responsive">';
                            hAC += '<p class="text-right text-muted m0">';
                            hAC += ActDetail.date + ' at ' + ActDetail.time;
                            hAC += '</p>';

                            hAC += '<div>' + ActDetail.announcement + '</div>';

                            if (ActDetail.Files.Count > 0) {
                                hAC += '<br><span><b>Attachments:</b></span><br>';
                                for (k = 0; k < ActDetail.Files.length; k++) {
                                    var attach = ActDetail.Files[k];
                                    hAC += '<span>k</span>';
                                    hAC += '<a href="https://ums.lpu.in/lpuums' + (attach.filepath) + ' target="_blank">' + attach.FileName + '</a><br>';
                                }
                            }

                            hAC += '<span><b>Uploaded By:</b></span><br />';
                            hAC += '<span>' + ActDetail.employeename + '</span><br />';
                            hAC += '<span>' + ActDetail.uploadedby + '</span><br />';
                            hAC += '<span style="font-size:smaller">*This is computer generated notice, not requiring signature</span>';

                            hAC += '</div>';
                            hAC += '</div>';
                            //End of Card Body

                            cAC++;

                        }
                        else if (category.code == "AM") {


                            if (!isAMHeader) {
                                //Card Header
                                hAM += '<div class="card">';
                                hAM += '<div class="card-header" id="' + ActDetail.categorycode + '">';
                                hAM += '<h2 class="mb-0">';
                                hAM += '<button class="btn btn-link" type="button" data-toggle="collapse" data-target="#collapse' + ActDetail.categorycode + '"" aria-expanded="false" aria-controls="collapse' + ActDetail.categorycode + '"">';
                                hAM += category.name + ' (<span id="c' + ActDetail.categorycode + '"></span>)';
                                hAM += '</button>';
                                hAM += '</h2>';
                                hAM += '</div>';

                                isAMHeader = true;
                            }

                            //Card Body
                            hAM += '<div id="collapse' + ActDetail.categorycode + '" class="collapse" aria-labelledby="' + ActDetail.categorycode + '" data-parent="#AnnouncementPanel">';
                            hAM += '<div class="card-body">'
                            hAM += '<span class="label label-sm label-default">' + category.name + '</span>';
                            if (ActDetail.status == "1") {
                                hAM += '<span class="announcement-subject"> <span style="color: red;" class="font-xs new-announcement">New</span>' + ActDetail.subject + '</span>';
                            }
                            else {
                                hAM += '<span class="announcement-subject">' + ActDetail.subject + '</span>';
                            }
                            hAM += '<span class="announcement-date">' + ActDetail.HeaderDate + '</span>';

                            hAM += '<div class="panel-body table-responsive">';
                            hAM += '<p class="text-right text-muted m0">';
                            hAM += ActDetail.date + ' at ' + ActDetail.time;
                            hAM += '</p>';

                            hAM += '<div>' + ActDetail.announcement + '</div>';

                            if (ActDetail.Files.Count > 0) {
                                hAM += '<br><span><b>Attachments:</b></span><br>';
                                for (k = 0; k < ActDetail.Files.length; k++) {
                                    var attach = ActDetail.Files[k];
                                    hAM += '<span>k</span>';
                                    hAM += '<a href="https://ums.lpu.in/lpuums' + (attach.filepath) + ' target="_blank">' + attach.FileName + '</a><br>';
                                }
                            }

                            hAM += '<span><b>Uploaded By:</b></span><br />';
                            hAM += '<span>' + ActDetail.employeename + '</span><br />';
                            hAM += '<span>' + ActDetail.uploadedby + '</span><br />';
                            hAM += '<span style="font-size:smaller">*This is computer generated notice, not requiring signature</span>';

                            hAM += '</div>';
                            hAM += '</div>';
                            //End of Card Body

                            cAM++;
                        }
                        else if (category.code == "CS") {


                            if (!isCUHeader) {
                                //Card Header
                                hCU += '<div class="card">';
                                hCU += '<div class="card-header" id="' + ActDetail.categorycode + '">';
                                hCU += '<h2 class="mb-0">';
                                hCU += '<button class="btn btn-link" type="button" data-toggle="collapse" data-target="#collapse' + ActDetail.categorycode + '"" aria-expanded="false" aria-controls="collapse' + ActDetail.categorycode + '"">';
                                hCU += category.name + ' (<span id="c' + ActDetail.categorycode + '"></span>)';
                                hCU += '</button>';
                                hCU += '</h2>';
                                hCU += '</div>';

                                isCUHeader = true;
                            }

                            //Card Body
                            hCU += '<div id="collapse' + ActDetail.categorycode + '" class="collapse" aria-labelledby="' + ActDetail.categorycode + '" data-parent="#AnnouncementPanel">';
                            hCU += '<div class="card-body">'
                            hCU += '<span class="label label-sm label-info">' + category.name + '</span>';
                            if (ActDetail.status == "1") {
                                hCU += '<span class="announcement-subject"> <span style="color: red;" class="font-xs new-announcement">New</span>' + ActDetail.subject + '</span>';
                            }
                            else {
                                hCU += '<span class="announcement-subject">' + ActDetail.subject + '</span>';
                            }
                            hCU += '<span class="announcement-date">' + ActDetail.HeaderDate + '</span>';

                            hCU += '<div class="panel-body table-responsive">';
                            hCU += '<p class="text-right text-muted m0">';
                            hCU += ActDetail.date + ' at ' + ActDetail.time;
                            hCU += '</p>';

                            hCU += '<div>' + ActDetail.announcement + '</div>';

                            if (ActDetail.Files.Count > 0) {
                                hCU += '<br><span><b>Attachments:</b></span><br>';
                                for (k = 0; k < ActDetail.Files.length; k++) {
                                    var attach = ActDetail.Files[k];
                                    hCU += '<span>k</span>';
                                    hCU += '<a href="https://ums.lpu.in/lpuums' + (attach.filepath) + ' target="_blank">' + attach.FileName + '</a><br>';
                                }
                            }

                            hCU += '<span><b>Uploaded By:</b></span><br />';
                            hCU += '<span>' + ActDetail.employeename + '</span><br />';
                            hCU += '<span>' + ActDetail.uploadedby + '</span><br />';
                            hCU += '<span style="font-size:smaller">*This is computer generated notice, not requiring signature</span>';

                            hCU += '</div>';
                            hCU += '</div>';
                            //End of Card Body

                            cCU++;

                        }
                        else if (category.code == "PL") {


                            if (!isPLHeader) {
                                //Card Header
                                hPL += '<div class="card">';
                                hPL += '<div class="card-header" id="' + ActDetail.categorycode + '">';
                                hPL += '<h2 class="mb-0">';
                                hPL += '<button class="btn btn-link" type="button" data-toggle="collapse" data-target="#collapse' + ActDetail.categorycode + '"" aria-expanded="false" aria-controls="collapse' + ActDetail.categorycode + '"">';
                                hPL += category.name + ' (<span id="c' + ActDetail.categorycode + '"></span>)';
                                hPL += '</button>';
                                hPL += '</h2>';
                                hPL += '</div>';

                                isPLHeader = true;
                            }

                            //Card Body
                            hPL += '<div id="collapse' + ActDetail.categorycode + '" class="collapse" aria-labelledby="' + ActDetail.categorycode + '" data-parent="#AnnouncementPanel">';
                            hPL += '<div class="card-body">'
                            hPL += '<span class="label label-sm label-primary">' + category.name + '</span>';
                            if (ActDetail.status == "1") {
                                hPL += '<span class="announcement-subject"> <span style="color: red;" class="font-xs new-announcement">New</span>' + ActDetail.subject + '</span>';
                            }
                            else {
                                hPL += '<span class="announcement-subject">' + ActDetail.subject + '</span>';
                            }
                            hPL += '<span class="announcement-date">' + ActDetail.HeaderDate + '</span>';

                            hPL += '<div class="panel-body table-responsive">';
                            hPL += '<p class="text-right text-muted m0">';
                            hPL += ActDetail.date + ' at ' + ActDetail.time;
                            hPL += '</p>';

                            hPL += '<div>' + ActDetail.announcement + '</div>';

                            if (ActDetail.Files.Count > 0) {
                                hPL += '<br><span><b>Attachments:</b></span><br>';

                                for (k = 0; k < ActDetail.Files.length; k++) {
                                    var attach = ActDetail.Files[k];
                                    hPL += '<span>k</span>';
                                    hPL += '<a href="https://ums.lpu.in/lpuums' + (attach.filepath) + ' target="_blank">' + attach.FileName + '</a><br>';
                                }
                            }

                            hPL += '<span><b>Uploaded By:</b></span><br />';
                            hPL += '<span>' + ActDetail.employeename + '</span><br />';
                            hPL += '<span>' + ActDetail.uploadedby + '</span><br />';
                            hPL += '<span style="font-size:smaller">*This is computer generated notice, not requiring signature</span>';

                            hPL += '</div>';
                            hPL += '</div>';
                            //End of Card Body

                            cPL++;
                        }
                        else if (category.code == "RE") {


                            if (!isREHeader) {
                                //Card Header
                                hRE += '<div class="card">';
                                hRE += '<div class="card-header" id="' + ActDetail.categorycode + '">';
                                hRE += '<h2 class="mb-0">';
                                hRE += '<button class="btn btn-link" type="button" data-toggle="collapse" data-target="#collapse' + ActDetail.categorycode + '"" aria-expanded="false" aria-controls="collapse' + ActDetail.categorycode + '"">';
                                hRE += category.name + ' (<span id="c' + ActDetail.categorycode + '"></span>)';
                                hRE += '</button>';
                                hRE += '</h2>';
                                hRE += '</div>';

                                isREHeader = true;
                            }

                            //Card Body
                            hRE += '<div id="collapse' + ActDetail.categorycode + '" class="collapse" aria-labelledby="' + ActDetail.categorycode + '" data-parent="#AnnouncementPanel">';
                            hRE += '<div class="card-body">'
                            hRE += '<span class="label label-sm label-warning">' + category.name + '</span>';
                            if (ActDetail.status == "1") {
                                hRE += '<span class="announcement-subject"> <span style="color: red;" class="font-xs new-announcement">New</span>' + ActDetail.subject + '</span>';
                            }
                            else {
                                hRE += '<span class="announcement-subject">' + ActDetail.subject + '</span>';
                            }
                            hRE += '<span class="announcement-date">' + ActDetail.HeaderDate + '</span>';

                            hRE += '<div class="panel-body table-responsive">';
                            hRE += '<p class="text-right text-muted m0">';
                            hRE += ActDetail.date + ' at ' + ActDetail.time;
                            hRE += '</p>';

                            hRE += '<div>' + ActDetail.announcement + '</div>';

                            if (ActDetail.Files.Count > 0) {
                                hRE += '<br><span><b>Attachments:</b></span><br>';

                                for (k = 0; k < ActDetail.Files.length; k++) {
                                    var attach = ActDetail.Files[k];
                                    hRE += '<span>k</span>';
                                    hRE += '<a href="https://ums.lpu.in/lpuums' + (attach.filepath) + ' target="_blank">' + attach.FileName + '</a><br>';
                                }
                            }

                            hRE += '<span><b>Uploaded By:</b></span><br />';
                            hRE += '<span>' + ActDetail.employeename + '</span><br />';
                            hRE += '<span>' + ActDetail.uploadedby + '</span><br />';
                            hRE += '<span style="font-size:smaller">*This is computer generated notice, not requiring signature</span>';

                            hRE += '</div>';
                            hRE += '</div>';
                            //End of Card Body

                            cRE++;

                        }



                        else if (category.code == "HR") {

                            if (!isHRHeader) {
                                //Card Header
                                hHR += '<div class="card">';
                                hHR += '<div class="card-header" id="' + ActDetail.categorycode + '">';
                                hHR += '<h2 class="mb-0">';
                                hHR += '<button class="btn btn-link" type="button" data-toggle="collapse" data-target="#collapse' + ActDetail.categorycode + '"" aria-expanded="false" aria-controls="collapse' + ActDetail.categorycode + '"">';
                                hHR += category.name + ' (<span id="c' + ActDetail.categorycode + '"></span>)';
                                hHR += '</button>';
                                hHR += '</h2>';
                                hHR += '</div>';

                                isHRHeader = true;
                            }

                            //Card Body
                            hHR += '<div id="collapse' + ActDetail.categorycode + '" class="collapse" aria-labelledby="' + ActDetail.categorycode + '" data-parent="#AnnouncementPanel">';
                            hHR += '<div class="card-body">'
                            hHR += '<span class="label label-sm label-success">' + category.name + '</span>';
                            if (ActDetail.status == "1") {
                                hHR += '<span class="announcement-subject"> <span style="color: red;" class="font-xs new-announcement">New</span>' + ActDetail.subject + '</span>';
                            }
                            else {
                                hHR += '<span class="announcement-subject">' + ActDetail.subject + '</span>';
                            }
                            hHR += '<span class="announcement-date">' + ActDetail.HeaderDate + '</span>';

                            hHR += '<div class="panel-body table-responsive">';
                            hHR += '<p class="text-right text-muted m0">';
                            hHR += ActDetail.date + ' at ' + ActDetail.time;
                            hHR += '</p>';

                            hHR += '<div>' + ActDetail.announcement + '</div>';

                            if (ActDetail.Files.Count > 0) {
                                hHR += '<br><span><b>Attachments:</b></span><br>';

                                for (k = 0; k < ActDetail.Files.length; k++) {
                                    var attach = ActDetail.Files[k];
                                    hHR += '<span>k</span>';
                                    hHR += '<a href="https://ums.lpu.in/lpuums' + (attach.filepath) + ' target="_blank">' + attach.FileName + '</a><br>';
                                }
                            }

                            hHR += '<span><b>Uploaded By:</b></span><br />';
                            hHR += '<span>' + ActDetail.employeename + '</span><br />';
                            hHR += '<span>' + ActDetail.uploadedby + '</span><br />';
                            hHR += '<span style="font-size:smaller">*This is computer generated notice, not requiring signature</span>';

                            hHR += '</div>';
                            hHR += '</div>';
                            //End of Card Body

                            cHR++;

                        }
                        else if (category.code == "EX") {


                            if (!isEXHeader) {
                                //Card Header
                                hEX += '<div class="card">';
                                hEX += '<div class="card-header" id="' + ActDetail.categorycode + '">';
                                hEX += '<h2 class="mb-0">';
                                hEX += '<button class="btn btn-link" type="button" data-toggle="collapse" data-target="#collapse' + ActDetail.categorycode + '"" aria-expanded="false" aria-controls="collapse' + ActDetail.categorycode + '"">';
                                hEX += category.name + ' (<span id="c' + ActDetail.categorycode + '"></span>)';
                                hEX += '</button>';
                                hEX += '</h2>';
                                hEX += '</div>';

                                isEXHeader = true;
                            }

                            //Card Body
                            hEX += '<div id="collapse' + ActDetail.categorycode + '" class="collapse" aria-labelledby="' + ActDetail.categorycode + '" data-parent="#AnnouncementPanel">';
                            hEX += '<div class="card-body">'
                            hEX += '<span class="label label-sm label-warning">' + category.name + '</span>';
                            if (ActDetail.status == "1") {
                                hEX += '<span class="announcement-subject"> <span style="color: red;" class="font-xs new-announcement">New</span>' + ActDetail.subject + '</span>';
                            }
                            else {
                                hEX += '<span class="announcement-subject">' + ActDetail.subject + '</span>';
                            }
                            hEX += '<span class="announcement-date">' + ActDetail.HeaderDate + '</span>';

                            hEX += '<div class="panel-body table-responsive">';
                            hEX += '<p class="text-right text-muted m0">';
                            hEX += ActDetail.date + ' at ' + ActDetail.time;
                            hEX += '</p>';

                            hEX += '<div>' + ActDetail.announcement + '</div>';

                            if (ActDetail.Files.Count > 0) {
                                hEX += '<br><span><b>Attachments:</b></span><br>';

                                for (k = 0; k < ActDetail.Files.length; k++) {
                                    var attach = ActDetail.Files[k];
                                    hEX += '<span>k</span>';
                                    hEX += '<a href="https://ums.lpu.in/lpuums' + (attach.filepath) + ' target="_blank">' + attach.FileName + '</a><br>';
                                }
                            }

                            hEX += '<span><b>Uploaded By:</b></span><br />';
                            hEX += '<span>' + ActDetail.employeename + '</span><br />';
                            hEX += '<span>' + ActDetail.uploadedby + '</span><br />';
                            hEX += '<span style="font-size:smaller">*This is computer generated notice, not requiring signature</span>';

                            hEX += '</div>';
                            hEX += '</div>';
                            //End of Card Body

                            cEX++;
                        }


                        //hAC Card Header closed
                        hAC += '</div>';

                        //hAC Card Header closed
                        hAM += '</div>';

                        //hCU Card Header closed
                        hCU += '</div>';

                        //hPL Card Header closed
                        hPL += '</div>';

                        //hPL Card Header closed
                        hRE += '</div>';

                        //hHR Card Header closed
                        hHR += '</div>';

                        //hEX Card Header Closed
                        hEX += '</div>';
                        ///Stu Closed
                        Hstu += '</div>';


                    }
                }
            }
        }



        $("#AnnouncementPanel").html(hAC);
        $("#AnnouncementPanel").append(hAM);
        $("#AnnouncementPanel").append(hCU);
        $("#AnnouncementPanel").append(hHR);
        $("#AnnouncementPanel").append(hEX);

        $("#AnnouncementPanel").append(hPL);
        $("#AnnouncementPanel").append(hRE);
        $("#AnnouncementPanel").append(Hstu);




        $("#cAC").html(cAC);
        $("#cAM").html(cAM);
        $("#cCU").html(cCU);
        $("#cHR").html(cHR);
        $("#cEX").html(cEX);

        $("#cPL").html(cPL);
        $("#cRE").html(cRE);
        $("#cstu").html(cstu);
        /// alert(cstu);
        $('#AnnouncementPanel').collapse({
            toggle: true
        });
    }
}

function resolvepanel1(dat) {



    var data = null;

    if (dat.d != null)
        data = dat.d;
    else
        data = dat;


    if (data != null) {
        var hST = '';
        var cST = 0;

        var isSTHeader = false;


        for (i = 0; i < data.length; i++) {
            var ActDetail = data[i];


            //Card Body



            if (!isSTHeader) {
                //Card Header
                hST = '<div class="tab-pane show" id="t' + 'ST' + '" role="tabpanel" aria-labelledby="l' + 'ST' + '">';

                isSTHeader = true;
            }

            //Card Body
            hST += '<div class="row">';
            hST += '<div class="col-md-12 col-lg-12 col-xl-12 col-left">';

            //hEX += '<span class="label label-sm label-info">' + category.name + '</span>';
            if (ActDetail.status == "1") {
                hST += '<span class="announcement-subject"> <span style="color: red;" class="font-xs new-announcement">New &nbsp;</span>' + ActDetail.subject + '</span>';
            }
            else {
                hST += '<span class="announcement-subject">' + ActDetail.subject + '</span>';
            }
            hST += '<span class="announcement-date">&nbsp;' + ActDetail.HeaderDate + '</span>';

            hST += '<div class="panel-body table-responsive">';
            //hEX += '<p class="text-right text-muted m0">';
            //hEX += ActDetail.date + ' at ' + ActDetail.time;
            //hEX += '</p>';

            hST += '<div>' + ActDetail.announcement + '</div>';

            if (ActDetail.Files.Count > 0) {
                hST += '<br><span><b>Attachments:</b></span><br>';
                for (k = 0; k < ActDetail.Files.length; k++) {
                    var attach = ActDetail.Files[k];
                    hST += '<span>k</span>';
                    hST += '<a href="https://ums.lpu.in/lpuums' + (attach.filepath) + ' target="_blank">' + attach.FileName + '</a><br>';
                }
            }

            hST += '<span><b>Uploaded By:</b></span><br />';
            hST += '<span>' + ActDetail.employeename + '</span><br />';
            hST += '<span>' + ActDetail.uploadedby + '</span><br />';
            hST += '<span style="font-size:smaller">*This is computer generated notice, not requiring signature</span>';

            hST += '</div>';

            hST += '</div>';
            hST += '</div><hr/>';
            //End of Card Body

            cST++;


        }

        if (hST != '') {
            //hEX Card Header closed
            hST += '</div>';
        }
        $("#tabcontent").append(hST);
        $("#cST").append(cST);

    }
}

function resolve1(dat) {


    var data = null;


    if (dat.d != null)
        data = dat.d;
    else
        data = dat;





    //alert(data);
    if (data != null) {


        var hAC = '', hAM = '', hCU = '', hPL = '', hRE = '', hHR = '', hEX = '', h = '', hST = '';
        var cAC = 0, cAM = 0, cCU = 0, cPL = 0, cRE = 0, cHR = 0, cEX = 0, ch = 0; cST = 0;

        var isACHeader = false, isAMHeader = false, isCUHeader = false, isPLHeader = false, isREHeader = false, isHRHeader = false, isEXHeader = false, isSTHeader = false;

        for (i = 0; i < data.length; i++) {
            var ActDetail = data[i];


            if (!isSTHeader) {
                //Card Header
                hST += '<div class="card">';
                hST += '<div class="card-header" id="' + "ST" + '">';
                hST += '<h2 class="mb-0">';
                hST += '<button class="btn btn-link" type="button" data-toggle="collapse" data-target="#collapse' + "ST" + '"" aria-expanded="false" aria-controls="collapse' + ActDetail.categorycode + '"">';
                hST += 'Student' + ' (<span id="c' + "ST" + '"></span>)';
                hST += '</button>';
                hST += '</h2>';
                hST += '</div>';

                isSTHeader = true;
            }

            //Card Body
            hST += '<div id="collapse' + "ST" + '" class="collapse" aria-labelledby="' + "ST" + '" data-parent="#AnnouncementPanel">';
            hST += '<div class="card-body">'
            hST += '<span class="label label-sm label-warning">' + 'Student' + '</span>';
            if (ActDetail.status == "1") {
                hST += '<span class="announcement-subject"> <span style="color: red;" class="font-xs new-announcement">New</span>' + ActDetail.subject + '</span>';
            }
            else {
                hST += '<span class="announcement-subject">' + ActDetail.subject + '</span>';
            }
            hST += '<span class="announcement-date">' + ActDetail.HeaderDate + '</span>';

            hST += '<div class="panel-body table-responsive">';
            hST += '<p class="text-right text-muted m0">';
            hST += ActDetail.date + ' at ' + ActDetail.time;
            hST += '</p>';

            hST += '<div>' + ActDetail.announcement + '</div>';

            if (ActDetail.Files.Count > 0) {
                hST += '<br><span><b>Attachments:</b></span><br>';

                for (k = 0; k < ActDetail.Files.length; k++) {
                    var attach = ActDetail.Files[k];
                    hST += '<span>k</span>';
                    hST += '<a href="https://ums.lpu.in/lpuums' + (attach.filepath) + ' target="_blank">' + attach.FileName + '</a><br>';
                }
            }

            hST += '<span><b>Uploaded By:</b></span><br />';
            hST += '<span>' + ActDetail.employeename + '</span><br />';
            hST += '<span>' + ActDetail.uploadedby + '</span><br />';
            hST += '<span style="font-size:smaller">*This is computer generated notice, not requiring signature</span>';

            hST += '</div>';
            hST += '</div>';
            //End of Card Body

            cST++;



            ///Stu Closed
            hST += '</div>';




        }

        //// console.log(hST);


        $("#AnnouncementPanel").append(hST);


        $("#cST").html(cST);



        $('#AnnouncementPanel').collapse({
            toggle: true
        });
    }
}

function reject(err) {

}


$.ajax({
    type: "POST",
    contentType: "application/json; charset=utf-8",
    dataType: "json",
    data: "{'RollId':'0'}",
    url: "StudentDashboard.aspx/UpcomingEvents",
    success: function (response) {

        var owl = $('#EventsData').owlCarousel({
            items: 1,
            loop: true,
            autoplay: 5000,
            autoplaySpeed: 800,
            autoplayHoverPause: true,
            mouseDrag: true,
            touchDrag: true,
            nav: false,
            pagination: false,
            dots: true,
            refresh: true
        });

        var h = '';
        // $("#EventsData").html("");
        $.each((response), function (i, vals) {
            $.each((vals), function (j, result) {

                var h = owl.trigger('add.owl.carousel', [jQuery('<div class="upcomming-events-widget clearfix">\
                            <div class="event-desc">\
                                <div class="event-tt" style="border-left:5px solid '+ result.Color + '; padding:5px;">\
                                    <h4 class="event-title happtitle">' + result.Title + '</h4>\
                                </div>\
                                <div class="col-md-12 pa0 misc-smfont">\
                                        <b>Date :</b>'+ result.EventDate + '</div>\
                                    <div class="col-md-12 pa0 misc-smfont">\
                                        <b>Time :</b>'+ result.EventTime + '</div>\
                                </div>\
                                    <div class="col-md-12"> <b>Venue :</b>'+ result.Venue + '</div>\
                                    <div class="col-md-12">'+ result.Description + '</div></div></div></div>')]);
            });

        });
        owl.trigger('refresh.owl.carousel');
        //$("#EventsData").html(h);
    },
    error: function (a, b, c) {
        //console.log(a); console.log(b); console.log(c);
    }
});

//Important Date
//$.ajax({
//    type: "GET",
//    datatype: 'json',
//    contenttype: 'application/json',
//    url: "https://happenings.lpu.in/wp-json/wp/v2/posts",
//    success: function (result) {
//        $("#HappeningData").html('');
//        $.each((result), function (i, vals) {
//            GetImages(result[i].link, result[i].title.rendered, result[i].excerpt.rendered, result[i].featured_media);
//        });
//    },
//    complete: function () {
//    },

//    error: function () {
//        // console.log("error in happening load");
//    },

//});

var AnnouncementCategory = null;
//Get Announcement Category
//Get Announcement Category
$.ajax({
    type: "POST",
    contentType: "application/json; charset=utf-8",
    dataType: "json",
    data: "{'LoginId':'Reg','Type':'S'}",
    url: "StudentDashboard.aspx/AnnouncementCategory",
    success: function (result) {
        var data = null;
        if (result.d == null)
            data = result;
        else
            data = result.d;

        AnnouncementCategory = data;

        for (i = 0; i < data.length; i++) {
            var category = data[i];
            //console.log(category);
            if (data.length > 0) {
                if (i == 0) {
                    $('#AnnouncementCategory').append($("<option></option>").attr("value", "All").text("All"));
                }
                $('#AnnouncementCategory').append($("<option></option>").attr("value", data[i].code).attr("totalAnnouncementcount", data[i].total).text(data[i].name + ' (' + data[i].today + ')'));
            }
        }
    },
    complete: function () {
    },

    error: function () {
        //console.log("error in happening load");
    },

});

//Get Announement Category

function GetImages(link, title, contents, id) {
    var imageurl = "";
    $.ajax({
        type: "GET",
        datatype: 'json',
        contenttype: 'application/json',
        url: "https://happenings.lpu.in/wp-json/wp/v2/media/" + id + "",
        success: function (result) {

            var owl = $('#HappeningData').owlCarousel({
                items: 1,
                loop: true,
                autoplay: 5000,
                autoplaySpeed: 800,
                autoplayHoverPause: true,
                mouseDrag: true,
                touchDrag: true,
                nav: false,
                pagination: false,
                dots: true
            });

            //imageurl = result.media_details.sizes.thumbnail.source_url;
            imageurl = result.media_details.sizes.td_696x385.source_url;
            //   var h = owl.trigger('add.owl.carousel', [jQuery(
            //       '<div class="row"><div class="col-lg-12 col-md-12 col-sm-12 col-xs-12 happening-img" style="flota:right;"><a href="javascript:;" style="text-decoration:none">\
            //<img alt="image" class="img-responsive" id="happimage" src="'+ imageurl + '" /></a></div><div class="col-lg-12 col-md-12 col-sm-12 col-xs-12 pl0"> <h4 class="mt0">\
            //<a href="' + link + '" target="_blank" class="primary-link happtitle" style="text-decoration:none">' + title + '</a></h4>\
            //<p id="happcontent">' + contents + '<br /> <a href="' + link + '" class="primary-link" style="text-decoration:none" target="_blank">Read More...<i class="fa fa-angle-right"></i></a></p></div></div>'

            //   )]);
            //   owl.trigger('refresh.owl.carousel');

            var h = owl.trigger('add.owl.carousel', [jQuery(
                '<div class="row">\
                        <a href="' + link + '" target="_blank" class="primary-link happtitle" style="text-decoration:none">\
                            <div class="col-md-12 happ-image">\
                                <div class="himg" style="background:url('+ imageurl + '); height:220px;background-size:cover">\
                            <div class="happ-ttile">' + title + '</div></div></a></div>'
            )]);
            owl.trigger('refresh.owl.carousel');

        },
        complete: function () {

        },
        error: function () {
            //  console.log("error in happening image load");
        }

    });
}

//LPU News
$.ajax({
    type: "POST",
    contentType: "application/json; charset=utf-8",
    dataType: "json",
    url: "StudentDashboard.aspx/GetLpuNews",
    success: function (response) {

        var owl = $('#LPUNews').owlCarousel({
            items: 1,
            loop: true,
            autoplay: 5000,
            autoplaySpeed: 800,
            autoplayHoverPause: true,
            mouseDrag: true,
            touchDrag: true,
            nav: false,
            pagination: false,
            dots: true,
            refresh: true,

        });

        var h = '';
        $.each((response), function (i, vals) {
            $.each((vals), function (j, result) {
                var h = owl.trigger('add.owl.carousel', [jQuery('<div class="upcomming-events-widget clearfix">\
                            <div class="event-desc row">\
                                    <div class="col-7 pt-1 pb-2 news-date"><i class="iconsminds-calendar-1"></i> ' + result.Releasedate + '</div>\
                            <div class="col-5 text-right pt-2 pb-2"><a href="' + result.Url + '" target="_blank" class="readmore">Read more..</a></div>\
                                <div class="event-tt col-md-12 text-center">' + result.Heading + '\
                                </div>\
                                    </div></div>')]);
            });
        });
        owl.trigger('refresh.owl.carousel');
        //$("#EventsData").html(h);
    },
    error: function (a, b, c) {
        //console.log(a); console.log(b); console.log(c);
    }
});






$.ajax({
    type: "POST",
    contentType: "application/json; charset=utf-8",
    url: "StudentDashboard.aspx/GetSeatingPlan",
    data: JSON.stringify({}),
    dataType: "json",
    success: function (data) {

        data = data.d;
        if (data == "NA") {
            $("#gg").hide();
        } else {
            $("#gg").show();
            $("#SeatingPlan").html(data);
        }
    },
    error: function (result) {
        ///swal("Ooops!", "Error Occured. Kindly try again Later!", "error");
    }
});


//Placed Students List
$.ajax({
    type: "POST",
    contentType: "application/json; charset=utf-8",
    dataType: "json",
    url: "StudentDashboard.aspx/GetPlacedStudentsList",
    success: function (response) {

        var owl = $('#PlacedStudentsList').owlCarousel({
            items: 1,
            loop: true,
            autoplay: 5000,
            autoplaySpeed: 800,
            autoplayHoverPause: true,
            mouseDrag: true,
            touchDrag: true,
            nav: false,
            pagination: false,
            dots: true,
            refresh: true,

        });

        var h = '';
        $.each((response), function (i, vals) {
            $.each((vals), function (j, result) {
                var h = owl.trigger('add.owl.carousel', [jQuery('<div class="upcomming-events-widget clearfix">\
                            <div class="event-desc row">\
                                    <div class="col-12 pt-1 pb-2 news-date"><i class="iconsminds-calendar-1"></i> ' + result.CompanyName + '</div>\
                           \
                                <div class="event-tt col-md-12 text-center">' + result.Details + '\
                                </div>\
                                    </div></div>')]);
            });
        });
        owl.trigger('refresh.owl.carousel');
        //$("#EventsData").html(h);
    },
    error: function (a, b, c) {
        //console.log(a); console.log(b); console.log(c);
    }
});






function IsMobileAndTablet() {
    var check = false;
    (function (a) { if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(a) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0, 4))) check = true; })(navigator.userAgent || navigator.vendor || window.opera);
    return check;
}

function getMobileOperatingSystem() {
    var userAgent = navigator.userAgent || navigator.vendor || window.opera;

    // Windows Phone must come first because its UA also contains "Android"
    if (/windows phone/i.test(userAgent)) {
        return "Windows Phone";
    }

    if (/android/i.test(userAgent)) {
        return "Android";
    }

    // iOS detection from:
    if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
        return "iOS";
    }

    return "unknown";
}

function openurl(category) {
    if (category == "lpulive") {
        if (IsMobileAndTablet()) {
            if (getMobileOperatingSystem() == "Android") {
                NewTab('https://play.google.com/store/apps/details?id=com.lpuchat&hl=en_IN');
            } else if (getMobileOperatingSystem() == "iOS") {
                NewTab('https://apps.apple.com/in/app/lpu-live/id1491482310');
            }
        } else {
            NewTab('https://lpulive.lpu.in/');
        }
    }
    else if (category == 'lputouch') {
        if (getMobileOperatingSystem() == "Android") {
            NewTab('https://play.google.com/store/apps/details?id=ums.lovely.university&hl=en_IN');
        } else if (getMobileOperatingSystem() == "iOS") {
            NewTab('https://apps.apple.com/in/app/lputouch/id509819753');
        } else if (getMobileOperatingSystem() == "unknown") {
            NewTab('https://play.google.com/store/apps/details?id=ums.lovely.university&hl=en_IN');
        }
    }
    else if (category == 'exam') {
        NewTab('https://play.google.com/store/apps/details?id=university.lpu.onlineexam');
    }
}

function NewTab(url) {
    window.open(url, "_blank");
}


function StudentInfo() {
    //Student Info
    $.ajax({
        type: "POST",
        contentType: "application/json; charset=utf-8",
        data: JSON.stringify({}),
        dataType: "json",
        url: "StudentDashboard.aspx/GetStudentBasicInformation",
        success: function (response) {
            $.each((response), function (i, vals) {
                $.each((vals), function (j, result) {
                    $("#p_name").html(result.StudentName);
                    /* $("#regno").html("<b>Reg. No.: " + result.Registrationnumber + " | Section: " + result.Section + "</b>");*/
                    $("#regno").html("<b>" + result.StuUIDName + ": " + result.StudentUid + " | Section: " + result.Section + "</b>");
                    $("#cgpa").html("<b> CGPA</b> : " + result.CGPA + "<i class='iconsminds-information'></i>")
                    $("#AttPercent").html("<b>ATTENDANCE</b> : " + result.AggAttendance + "%" + " <i class='iconsminds-information'></i>");
                    $("#progname").html("<b>" + result.Program + "</b>")
                    if (result.StudentPicture != "") {
                        $("#p_picture").prop("src", "data:image/jpeg;charset=utf-8;base64," + result.StudentPicture);
                    }
                    else {
                        $("#p_picture").prop("src", "dashboard/img/blank_user.png");
                    }
                    var IsVisitor = result.VisitorTure;
                    if (IsVisitor == "True") {
                        launchVirtualTour();
                    }


                    /////Show hide control
                    if (result.StuUIDName == "CID") {
                        document.getElementById("ctl00_ContentPlaceHolder1_LibBooks").style.display = "none";
                        document.getElementById("krmslok").style.display = "none";
                        document.getElementById("kcertificate").style.display = "none";
                        document.getElementById("kpartimejob").style.display = "none";

                        document.getElementById("KYourDost").style.display = "none";
                        document.getElementById("KMyClass").style.display = "none";

                        document.getElementById("Kedurev").style.display = "none";
                        document.getElementById("K1").style.display = "none";
                        document.getElementById("K2").style.display = "none";
                        document.getElementById("gg").style.display = "none";
                        document.getElementById("KAuthorities").style.display = "none";
                    }


                });
            });
        },
        error: function (a, b, c) {
            //console.log(a); console.log(b); console.log(c);
        }
    });
}


function getAtt() {
    GetAttendanceDetails();
    GetDayWiseAttDetails();
}
function GetAttendanceDetails() {
    $("#AttSummary").html("");
    $.ajax({
        type: "POST",
        contentType: "application/json; charset=utf-8",
        url: "StudentDashboard.aspx/StudentAttendanceSummary",
        data: JSON.stringify({}),
        dataType: "json",
        success: function (data) {
            data = data.d;
            $("#AttSummary").html(data);
        },
        error: function (result) {
            ///swal("Ooops!", "Error Occured. Kindly try again Later!", "error");
            //$.unblockUI();
        }
    });
    // BlockUiF();
}
function GetDayWiseAttDetails() {
    $("#accordion").html("");
    $.ajax({
        type: "POST",
        contentType: "application/json; charset=utf-8",
        url: "StudentDashboard.aspx/StudentAttendanceDetail",
        data: JSON.stringify({}),
        dataType: "json",
        success: function (data) {
            data = data.d;
            $("#accordion").html(data);
        },
        error: function (result) {
            //// swal("Ooops!", "Error Occured. Kindly try again Later!", "error");
            //$.unblockUI();
        }
    });
    // BlockUiF();
}




function getpendingreq() {
    $("#txtDetails").val("");
    $("#MobNo").val("");
    $("#ddlRelation").val("");
    ////$("#refno").val(authority);
    var ath = $("#refno").val();
    $.ajax({
        type: "POST",
        contentType: "application/json; charset=utf-8",
        url: "StudentDashboard.aspx/GetPendingAppointments",
        data: JSON.stringify({ "AuthCode": ath }),
        dataType: "json",
        success: function (data) {
            data = data.d;
            if (data == "NA") {
                $("#PendingRequests").html("");
                $("#PendingRequests").hide();
                $("#ContentData").show();
                $("#PendingRequests").append(data);
            }
            else {
                $("#PendingRequests").html("");
                $("#PendingRequests").show();
                $("#ContentData").hide();
                $("#PendingRequests").append(data);
            }
        },
        error: function (result) {
            ////swal("Ooops!", "Error Occured. Kindly try again Later!", "error");
            //$.unblockUI();
        }
    });
}

function getMarks() {
    getMarksDetails();
    getGrades();
}
function getGrades() {
    $("#GradeDetails").html("");
    $.ajax({
        type: "POST",
        contentType: "application/json; charset=utf-8",
        url: "StudentDashboard.aspx/TermWiseCGPA",
        data: JSON.stringify({}),
        dataType: "json",
        success: function (data) {
            data = data.d;
            $("#GradeDetails").html(data);
        },
        error: function (result) {
            ///swal("Ooops!", "Error Occured. Kindly try again Later!", "error");
            //$.unblockUI();
        }
    });

}
function getMarksDetails() {
    $("#marksdetails").html("");
    $.ajax({
        type: "POST",
        contentType: "application/json; charset=utf-8",
        url: "StudentDashboard.aspx/TermWiseMarks",
        data: JSON.stringify({}),
        dataType: "json",
        success: function (data) {
            data = data.d;
            $("#marksdetails").html(data);
        },
        error: function (result) {
            ///swal("Ooops!", "Error Occured. Kindly try again Later!", "error");
            //$.unblockUI();
        }
    });
    // BlockUiF();
}


//Marques

; (function ($, window, document, undefined) {

    // Create the defaults once
    var pluginName = "marquee",

        defaults = {
            enable: true,  //plug-in is enabled
            direction: 'vertical',   //è¿åŠ¨æ–¹å‘.  vertical : horizontal
            itemSelecter: 'li',  //å­èŠ‚ç‚¹é€‰æ‹©å™¨
            delay: 3000,  //åŠ¨ç”»æ¸²æŸ“å»¶è¿Ÿæ—¶é—´
            speed: 1,  //åŠ¨ç”»æ¸²æŸ“è·ç¦».
            timing: 1, //åŠ¨ç”»æ¸²æŸ“é€ŸçŽ‡.
            mouse: true //é¼ æ ‡ç§»å…¥åœæ­¢åŠ¨ç”»

        };


    function Widget(element, options) {
        this.element = element;
        this.settings = $.extend({}, defaults, options);
        this._defaults = defaults;
        this._name = pluginName;
        this.version = 'v1.0';


        this.$element = $(this.element);
        this.$wrapper = this.$element.parent();
        this.$items = this.$element.children(this.settings.itemSelecter);


        this.next = 0;
        this.timeoutHandle;
        this.intervalHandle

        if (!this.settings.enable) return; //æ£€æµ‹æ’ä»¶æ˜¯å¦å¼€å¯.
        this.init();
    }


    Widget.prototype = {

        init: function () {

            var that = this;

            //å­èŠ‚ç‚¹å ç”¨æ€»é«˜åº¦.
            var totalSize = 0;

            $.each(this.$items, function (index, element) {

                totalSize += that.isHorizontal()
                    ? parseInt($(element).outerWidth())
                    : parseInt($(element).outerHeight());

            });

            //çˆ¶èŠ‚ç‚¹å®žé™…é«˜åº¦
            var elmentTotalSize = this.isHorizontal()
                ? this.$element.outerWidth
                : this.$element.outerHeight;

            //åˆ¤æ–­å­èŠ‚ç‚¹æ€»é«˜åº¦æ˜¯å¦å¤§äºŽçˆ¶èŠ‚ç‚¹é«˜åº¦, å¦åˆ™æ’ä»¶åœæ­¢è¿è¡Œ.
            if (totalSize < elmentTotalSize) return;

            //è®¾ç½®åŠ¨ç”»æ¸²æŸ“æ‰€éœ€çš„CSSæ ·å¼.
            this.$wrapper.css({

                position: 'relative',
                overflow: 'hidden'

            });

            this.$element.css({

                position: 'absolute',
                top: 0,
                left: -20

            });

            this.$element.css(this.isHorizontal() ? 'width' : 'height', '1000%');


            //å…‹éš†å­èŠ‚ç‚¹.
            this.cloneAllItems();

            //é¼ æ ‡ç›‘å¬
            if (this.settings.mouse)
                this.addHoverEvent(this);

            this.timer(this);


        },

        /**
          * è®¡æ—¶å™¨.
          */
        timer: function (that) {

            this.timeoutHandle = setTimeout(function () { that.play(that) }, this.settings.delay);

        },


        /**
         * æ’­æ”¾.
         */
        play: function (that) {


            this.clearTimeout();

            var target = 0;

            for (var i = 0; i <= this.next; i++) {

                target -= this.isHorizontal()
                    ? parseInt($(this.$items.get(this.next)).outerWidth())
                    : parseInt($(this.$items.get(this.next)).outerHeight());


            }

            this.intervalHandle = setInterval(function () { that.animate(target) }, this.settings.timing);
        },


        /**
         * åŠ¨ç”»æ¸²æŸ“.
         */
        animate: function (target) {

            var mark = this.isHorizontal() ? 'left' : 'top';

            var present = parseInt(this.$element.css(mark));


            if (present > target) {
                if (present - this.settings.speed <= target) {
                    this.$element.css(mark, target);

                } else

                    this.$element.css(mark, present - this.settings.speed);

            } else {


                this.clearInterval();

                if (this.next + 1 < this.$items.length) {

                    this.next++;

                } else {

                    this.next = 0;
                    this.$element.css(mark, 0);

                }
                this.timer(this);
            }

        },


        isHorizontal: function () {

            return this.settings.direction == 'horizontal';
        },

        /**
         * å…‹éš†å­èŠ‚ç‚¹
         */
        cloneAllItems: function () {

            this.$element.append(this.$items.clone());
        },



        /**
         * å–æ¶ˆæ—¶é’Ÿé˜Ÿåˆ—.
         */
        clearTimeout: function () {

            clearTimeout(this.timeoutHandle);
        },

        /**
         * å–æ¶ˆå®šæ—¶å™¨é˜Ÿåˆ—.
         */
        clearInterval: function () {

            clearInterval(this.intervalHandle);
        },

        /**
         * æš‚åœåŠ¨ç”»æ¸²æŸ“.
         * @return {[type]} [description]
         */
        addHoverEvent: function (that) {

            this.$wrapper
                .mouseenter(function () {

                    that.clearInterval()
                    that.clearTimeout();

                })
                .mouseleave(function () {

                    that.play(that);

                });
        }



    }//prototype


    $.fn[pluginName] = function (options) {

        // chain jQuery functions
        return this.each(function () {
            if (!$.data(this, "plugin_" + pluginName)) {
                $.data(this, "plugin_" + pluginName, new Widget(this, options));
            }
        });

    };

})(jQuery, window, document);
