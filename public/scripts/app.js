// Client facing scripts here
$('.quantityAjax').on("keyup keydown change", function() {
  $(".update-form").trigger("submit");
  $("#subtotalTarget").load("/cart #subtotalTarget");
});

$('.update-form').submit(function(e) {
  e.preventDefault();
  const postUrl = $(this).attr("action");
  const values = $(this).serialize();

  $.ajax({
    type: "POST",
    url: postUrl,
    data: values,
    success: (res) => {
      console.log("success");
    }
  });
});
