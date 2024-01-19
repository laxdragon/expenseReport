/*
 * Expense Report JS
 */

// stored files array (global)
storedFiles = [];

function setTheme(isLight)
{
    const themeSwitch = $("#theme_switch");
    const themeLabel = $("#theme_label");
    if (isLight)
    {
        $(document.body).addClass("light-theme")
        $(document.body).removeClass("dark-theme")
        themeSwitch.prop("checked", false);
        themeLabel.html("Theme: Light");
    }
    else
    {
        $(document.body).addClass("dark-theme")
        $(document.body).addClass("light-theme")
        themeSwitch.prop("checked", true);
        themeLabel.html("Theme: Dark");
    }
}

$(document).ready(function()
{
    setTheme(document.cookie.includes("theme=light"));

    const themeSwitch = $("#theme_switch");
    themeSwitch.click(function(e)
    {
        const isLight = !themeSwitch.prop("checked");
        if (isLight)
            document.cookie = "theme=light; path=/; max-age=31536000";
        else
            document.cookie = "theme=dark; path=/; max-age=31536000";

        setTheme(isLight);
    });

    $('input[name=date]').val(new Date().toDateInputValue());

    $("form[name=erForm]").find(':input').focus(function(){
        $(this).removeClass('is-invalid');
    });

    var rowTmpl = $("#erRowTmpl").html();
    $("#addERrow").click(function(e)
    {
        e.preventDefault();
        var row = $("#erTable").append(rowTmpl);
        $(row).find(':input').focus(function(){
            $(this).removeClass('is-invalid');
        });
        $(".btn-row-del").click(function(e){
            $(this).parents(".form-row").first().remove();
        });
    });
    $("#addERrow").click();

    cw_formAttachments("form[name=erForm]");

    $("form[name=erForm]").submit(function(e)
    {
        e.preventDefault();

        var $this = this;
        var err = false;

        $(this).prop('disabled', true);
        $(this).addClass('btn-disabled');
        $("#erError").hide();
        $("#erDebug").hide();
        $(this).find(':input').removeClass('is-invalid');
        var flds = {};

        $(this).find(':input').each(function(x,f){
            if ($(this).prop('required') && !$(f).val()) {
                err = true;
                $(this).addClass("is-invalid");
            }
            flds[$(f).attr("name")] = $(f).val();
        });

        cw_checkStoredFiles(err, "#attFilesArea .files-error");

        if (!storedFiles.length) {
            err = true;
            $("#attFilesArea .files-required").show();
        }

        if (err) {
            $("#erError").removeClass("d-none").show();
            $(this).prop('disabled', false);
            $(this).removeClass('btn-disabled');
            return false;
        }

        formData = cw_getAllFormData(this);

        console.log(storedFiles);
        console.log(formData);

        pleaseWait.show();

        $.ajax({
            url: $(this).attr("action"),
            type: 'POST',
            enctype: 'multipart/form-data',
            data: formData,
            success: function(ret, textStatus)
            {
                console.log(ret);
                pleaseWait.hide();
                if (ret == "OK") {
                    $($this).hide();
                    $("#erDone").removeClass("d-none").show();
                    return;
                }
                $("#erDebug").html(JSON.stringify(ret));
                $("#erDebug").removeClass("d-none").show();
            },
            error: function(ret)
            {
                console.log(ret);
                pleaseWait.hide();
                $("#erDebug").html(JSON.stringify(ret));
                $("#erDebug").removeClass("d-none").show();
            },
            cache: false,
            contentType: false,
            processData: false,
            dataType: "json"
        });

    });

});

function isset (o) {
  return (o!=null && typeof(o)!="undefined");
};

function is_array (o) {
  return (o!=null && typeof(o)=="object" && typeof(o.length)=="number" && (o.length==0 || isset(o[0])));
};

function in_array (string, array) {
    if (!is_array(array))
        return false;
    for (i = 0; i < array.length; i++) {
        if (array[i] == string) {
            return true;
        }
    }
    return false;
};

var gen_passwd = function (len)
{
    if (!len) len = 8;
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for( var i=0; i < len; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    return text;
};

var pleaseWait;
pleaseWait = pleaseWait || (function () {
    var pleaseWaitDiv = $('<div class="modal fade" id="pleaseWaitDialog" data-backdrop="static" data-keyboard="false"><div class="modal-dialog modal-dialog-centered"><div class="modal-content"><div class="modal-body text-center"><h1><i class="fas fa-spinner fa-pulse"></i> Please Wait...</h1></div></div></div></div>');
    return {
        show: function() {
            pleaseWaitDiv.modal();
        },
        hide: function () {
            pleaseWaitDiv.modal('hide');
            $(pleaseWaitDiv).remove();
            $("body").find(".modal-backdrop").remove();
        }
    };
})();

// build formData object from existing form
function cw_getAllFormData (form)
{
    var formData = new FormData();
    $(form).find("*").filter(':input').each(function()
    {
        if (!$(this).attr('name'))
            return true;
        switch ($(this).attr('type'))
        {
            case "file":
                if (typeof storedFiles !== 'undefined') {
                    for(var i=0, len=storedFiles.length; i<len; i++) {
                        formData.append($(this).attr('name')+'[]', storedFiles[i]);
                    }
                }
                break;
            case "checkbox":
                if ($("input[name='"+$(this).attr('name')+"']:checked").val())
                    formData.append($(this).attr('name'), $("input[name='"+$(this).attr('name')+"']:checked").val());
                break;
            case "radio":
                formData.append($(this).attr('name'), $("input[name='"+$(this).attr('name')+"']:checked").val());
                break;
            default:
                formData.append($(this).attr('name'), $(this).val());
        }
    });
    return formData;
}

// loop ad check stored files before submitting (set error string)
function cw_checkStoredFiles (err, errMsg)
{
    if (storedFiles.length)
    {
        var attTotalSize = 0;
        for (var i=0, len=storedFiles.length; i < len; i++)
        {
            attTotalSize += storedFiles[i].size;
        }
        if (attTotalSize > 100000000)
        {
            $(errMsg).show();
            err = true;
        }
    }
}

// init attachments code on form
function cw_formAttachments (form)
{
    // add file
    var cw_attAddFile = function (file)
    {
        // validate length
        if (file.size > 10000000) {
            $("#attFilesArea .files-error").show();
            return false;
        }

        // save this file
        storedFiles.push(file);

        // init reader object
        var reader = new FileReader();
        reader.onload = function (e)
        {
            // thumb
            var thumb = "";
            if (in_array(file.type, ['image/gif','image/jpeg','image/png']))
                thumb = '<img src="' + e.target.result + '">';

            // display image row
            $("#attTable").append('<tr>' +
                '<td><button type="button" class="delImg btn btn-outline-secondary" data-file="' + file.name + '"><i class="fas fa-trash"></i></button></td>' +
                '<td class="attThumb">' + thumb + '</td>' +
                '<td class="attDesc">' + file.name + '</td></tr>');

            // delete image action
            $("#attTable").find("button.delImg:last-child").click(function()
            {
                var file = $(this).data('file');
                for(var i=0; i < storedFiles.length ;i++)
                {
                    if(storedFiles[i].name === file)
                    {
                        storedFiles.splice(i,1);
                        break;
                    }
                }
                $(this).parents("tr").first().fadeOut("fast", function(){ $(this).remove(); });
            });

            // clear errors
            $("#attFilesArea .files-required").hide();
            $("#attFilesArea .files-error").hide();
        };

        // init view file
        reader.readAsDataURL(file);
    }

    // on drag and drop of attachment
    $(form).on("dragover", function(e) { e.preventDefault(); e.stopPropagation(); });
    $(form).on("drop", function(e) { e.preventDefault(); e.stopPropagation(); });
    $(form).on('drop', function (e)
    {
        var files = e.originalEvent.dataTransfer.files;
        for (var i=0, len=files.length; i < len; i++)
        {
            cw_attAddFile(files[i]);
        }
    });

    // on paste of attachment in textarea
    $(form).find("textarea").each(function()
    {
        $(this).on('paste', function (e){
            var data = e.originalEvent;
            if (data.clipboardData && data.clipboardData.items) {
                var items = data.clipboardData.items;
                for (var i = 0; i < items.length; i++) {
                    if (items[i].type.indexOf('image') !== -1) {
                        var file = items[i].getAsFile();
                        var ext = file.type.split("\/")[1];
                        var r = gen_passwd(8);
                        newfile = new File([file], "pasted_" + r + "." + ext, { type: file.type, });
                        cw_attAddFile(newfile);
                        return false;
                    }
                }
            }
        });
    });

    // on add of attachment
    $(form).find("input[type=file]").change(function()
    {
        var fld = this;
        for (var i=0, len=fld.files.length; i < len; i++)
        {
            cw_attAddFile(fld.files[i]);
        }
    });
}

Date.prototype.toDateInputValue = (function() {
    var local = new Date(this);
    local.setMinutes(this.getMinutes() - this.getTimezoneOffset());
    return local.toJSON().slice(0,10);
});


