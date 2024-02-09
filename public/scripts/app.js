$(document).ready(function() {
  
  // ADJUST QUANTITY BUILT IN ARROWS
  $('.quantityAjax').on("keyup keydown change", function() {
    $(".update-form").trigger("submit");
    setTimeout(() => {
      $("#subtotalTarget").load("/cart #subtotalTarget");
    }, 5);
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

  // QUANITITY PLUS AND MINUS
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
    setTimeout(() => {
      $("#subtotalTarget").load("/cart #subtotalTarget");
    }, 5);
  });

  // REMOVE FOOD ITEM
  $('.removeItemAjax').submit(function(e) {
    e.preventDefault();
    const postURL = $(this).attr("action");
    const values = $(this).serialize();

    $.ajax({
      type: "POST",
      url: postURL,
      data: values,
      success: (res) => {
        console.log("success");
      }
    });
  });

  // ADD ITEM TO CART
  $('.addToCartButton').on('click', function() {
    $(this).closest('.addToCartForm').trigger("submit");
    $(this).closest('.addToCartForm')[0].reset();
  });

  $('.addToCartForm').submit(function(e) {
    e.preventDefault();
    const postURL = $(this).attr("action");
    const values = $(this).serialize();

    $.ajax({
      type: "POST",
      url: postURL,
      data: values,
      success: (res) => {
        console.log("success");
      }
    });

  });
});