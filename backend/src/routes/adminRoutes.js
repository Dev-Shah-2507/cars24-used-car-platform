const router = require('express').Router();
const auth = require('../middleware/auth');
const allowRoles = require('../middleware/role');
const c = require('../controllers/adminController');

router.use(auth, allowRoles('admin'));

router.get('/ping', (req, res) => res.json({ ok: true, role: req.user.role, name: req.user.name }));
router.get('/stats', c.stats);
router.get('/vehicles', c.listVehicles);
router.get('/listings', c.listListings);
router.patch('/vehicles/:id/status', c.updateStatus);
router.patch('/vehicles/:id/refurbishment', c.updateRefurbishment);

module.exports = router;
