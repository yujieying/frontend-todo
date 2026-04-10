import { createApp } from "vue";
import { createPinia } from "pinia";
import { createRouter, createWebHistory } from "vue-router";
import {
  Button,
  Cell,
  CellGroup,
  Checkbox,
  CheckboxGroup,
  DropdownItem,
  DropdownMenu,
  Empty,
  Field,
  Form,
  NavBar,
  Popup,
  Radio,
  RadioGroup,
  Space,
  Switch,
  Tag,
  Toast,
} from "vant";
import "vant/lib/index.css";
import App from "./App.vue";
import routes from "./router";
import "./styles/app.less";

const app = createApp(App);
const pinia = createPinia();
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

app.use(pinia);
app.use(router);
app.use(Button);
app.use(Cell);
app.use(CellGroup);
app.use(Checkbox);
app.use(CheckboxGroup);
app.use(DropdownItem);
app.use(DropdownMenu);
app.use(Empty);
app.use(Field);
app.use(Form);
app.use(NavBar);
app.use(Popup);
app.use(Radio);
app.use(RadioGroup);
app.use(Space);
app.use(Switch);
app.use(Tag);
app.use(Toast);

app.mount("#app");
