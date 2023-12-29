odoo.define('point_of_sale.ReloadPOS', function (require) {
    'use strict';

    const PosComponent = require('point_of_sale.PosComponent');
    const Registries = require('point_of_sale.Registries');

    class ReloadPOS extends PosComponent {
        constructor() {
            super(...arguments);
        }

        async onClick() {
            let {confirmed, payload: result} = await this.showPopup('ConfirmPopup', {
                title: this.env._t('Need Confirm ?'),
                body: this.env._t('Are you want reload POS Screen'),
            })
            if (confirmed) {
                this.env.pos.reload_pos()
            }
        }
    }

    ReloadPOS.template = 'ReloadPOS';

    Registries.Component.add(ReloadPOS);

    return ReloadPOS;
});
