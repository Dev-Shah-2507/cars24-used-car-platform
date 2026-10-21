const router = require('express').Router();
const auth = require('../middleware/auth');
const allowRoles = require('../middleware/role');
const c = require('../controllers/evaluatorController');

router.use(auth, allowRoles('evaluator'));

router.get('/ping', (req, res) => res.json({ ok: true, role: req.user.role, name: req.user.name }));
router.get('/inspections', c.listInspections);
router.get('/inspections/:id', c.getInspection);
router.post('/inspections/:id/submit', c.submitInspection);

module.exports = router;
