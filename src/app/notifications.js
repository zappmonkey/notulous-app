var app = app || {};

app.notification = {};

app.notification.add = function(title, content, type) {
    $("#notifications").prepend(
        notulous.util.renderTpl("notification", {
            title: title,
            content: content,
            type: type
        })
    );
    $('#notifications .notification:first').on('click', function(e) {
        $(this).remove();
    });
};
