const router = require('express').Router();
const auth = require('../middleware/auth');
const allowRoles = require('../middleware/role');
const c = require('../controllers/buyerController');

router.use(auth, allowRoles('buyer'));

router.get('/ping', (req, res) => res.json({ ok: true, role: req.user.role, name: req.user.name }));
router.get('/vehicles', c.listVehicles);
router.get('/vehicles/:id', c.getVehicle);

module.exports = router;
