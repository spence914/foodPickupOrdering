$(document).ready(function() {
  
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