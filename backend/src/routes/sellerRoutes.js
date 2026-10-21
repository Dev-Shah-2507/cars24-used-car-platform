const router = require('express').Router();
const auth = require('../middleware/auth');
const allowRoles = require('../middleware/role');
const c = require('../controllers/sellerController');

router.use(auth, allowRoles('seller'));

router.get('/ping', (req, res) => res.json({ ok: true, role: req.user.role, name: req.user.name }));
router.post('/vehicles', c.createVehicle);
router.get('/vehicles', c.listVehicles);
router.get('/vehicles/:id', c.getVehicle);
router.post('/vehicles/:id/book-inspection', c.bookInspection);
router.post('/vehicles/:id/respond-offer', c.respondToOffer);

module.exports = router;
