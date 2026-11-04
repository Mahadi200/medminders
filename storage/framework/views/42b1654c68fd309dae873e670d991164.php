<!doctype html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="<?php echo e(csrf_token()); ?>">
    <title>MedMinders</title>
    <?php echo app('Illuminate\Foundation\Vite')->reactRefresh(); ?>
    <?php echo app('Illuminate\Foundation\Vite')('resources/js/App.jsx'); ?>
</head>
<body>
    <div id="app"></div>
</body>
</html>
<?php /**PATH D:\WEB DESIGN IT\IDEA\MedMinders\resources\views/app.blade.php ENDPATH**/ ?>