var p = document.getElementById("password");
var cp = document.getElementById("cpassword");

function validatep()
{
    if (p.value === cp.value)
    {
        cp.setCustomValidity('');
    }
    else
    {
        cp.setCustomValidity("Passwords do not match !");
    }
}

p.onchange = validatep;
cp.onkeyup= validatep;