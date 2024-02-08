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
    success: () => {
      console.log("success");
    }
  });
});

$('.quantity-btn').on('click', function() {
  if ($(this).hasClass('fa-plus')) {
    const addValue = parseInt($(this).parent().find('.quantityAjax').val()) + 1;
    $(this).parent().find('.quantityAjax').val(addValue).trigger('change');
  }

  if ($(this).hasClass('fa-minus')) {
    let removeValue = parseInt($(this).parent().find('.quantityAjax').val()) - 1;
    if (removeValue === 0) {
      removeValue = 1;
    }
    $(this).parent().find('.quantityAjax').val(removeValue).trigger('change');
  }

});

$('.remove-btn').on('click', function() {
  $(this).closest(".removeItemAjax").trigger("submit");
  const $foodItem = $(this).closest('.foodItem');
  $foodItem.hide();
  $("#subtotalTarget").load("/cart #subtotalTarget");
});

// Remove foodItem
$('.removeItemAjax').submit(function(e) {
  e.preventDefault();
  const postURL = $(this).attr("action");
  const values = $(this).serialize();

  $.ajax({
    type: "POST",
    url: postURL,
    data: values,
    success: () => {
      console.log("success");
    }
  });
});
